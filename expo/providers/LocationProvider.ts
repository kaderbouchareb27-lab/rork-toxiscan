import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import createContextHook from '@nkzw/create-context-hook';
import { setCachedUserLocation, UserLocation } from '@/utils/regionDetection';

const LOCATION_CACHE_KEY = 'toxiscan_user_location_v1';
const LOCATION_PERMISSION_ASKED_KEY = 'toxiscan_location_permission_asked_v1';

interface CachedLocation extends UserLocation {
  savedAt: number;
}

/**
 * Provides the user's coarse location (city + region/state + country) via
 * device GPS + reverse geocoding. Persists the last known city in AsyncStorage
 * so AI prompts can recommend stores near the user without re-prompting on
 * every scan. Location is OPTIONAL — if denied, app falls back to locale-based
 * region detection only.
 */
export const [LocationProvider, useLocation] = createContextHook(() => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [hasAsked, setHasAsked] = useState<boolean>(false);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Hydrate from cache on mount
  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CachedLocation;
          setLocation(parsed);
          setCachedUserLocation(parsed);
          console.log('[Location] Hydrated from cache:', parsed.city, parsed.subregion);
        }
        const asked = await AsyncStorage.getItem(LOCATION_PERMISSION_ASKED_KEY);
        setHasAsked(asked === 'true');
      } catch (e) {
        console.log('[Location] Hydrate error:', e);
      }
    })();
  }, []);

  const requestAndResolve = useCallback(async (): Promise<UserLocation | null> => {
    if (Platform.OS === 'web') {
      console.log('[Location] Web not supported');
      return null;
    }
    setIsResolving(true);
    try {
      await AsyncStorage.setItem(LOCATION_PERMISSION_ASKED_KEY, 'true');
      setHasAsked(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[Location] Permission status:', status);
      if (status !== 'granted') return null;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const place = places?.[0];
      if (!place) return null;

      const resolved: UserLocation = {
        city: place.city ?? place.subregion ?? null,
        subregion: place.region ?? place.subregion ?? null,
        country: place.country ?? null,
        countryCode: (place.isoCountryCode ?? '').toUpperCase() || null,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      const toCache: CachedLocation = { ...resolved, savedAt: Date.now() };
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(toCache));
      setLocation(resolved);
      setCachedUserLocation(resolved);
      console.log('[Location] Resolved:', resolved.city, resolved.subregion, resolved.countryCode);
      return resolved;
    } catch (e) {
      console.log('[Location] Resolve error:', e);
      return null;
    } finally {
      setIsResolving(false);
    }
  }, []);

  const clearLocation = useCallback(async () => {
    await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    setLocation(null);
    setCachedUserLocation(null);
  }, []);

  return useMemo(
    () => ({ location, hasAsked, isResolving, requestAndResolve, clearLocation }),
    [location, hasAsked, isResolving, requestAndResolve, clearLocation],
  );
});
