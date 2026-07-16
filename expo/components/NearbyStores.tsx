import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { MapPin, Navigation, Store, LocateFixed } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { pick } from '@/utils/i18n';
import { useLocation } from '@/providers/LocationProvider';
import {
  getStoreRegion,
  getRegionStores,
  getRegionSpecialtyStores,
  getRegionLocalMarkets,
} from '@/utils/regionDetection';

function StoreRow({
  name,
  icon,
  onPress,
}: {
  name: string;
  icon: React.ReactNode;
  onPress: (name: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.storeRow}
      activeOpacity={0.6}
      onPress={() => onPress(name)}
      testID={`meal-store-${name}`}
    >
      {icon}
      <Text style={styles.storeRowText} numberOfLines={1}>{name}</Text>
      <Navigation color="#86C091" size={13} />
    </TouchableOpacity>
  );
}

/**
 * Geolocation store finder for the healthier-meal recipe: shows where to buy the
 * ingredients near the user. Mirrors the product scan's "Healthier alternatives"
 * store finder — region-based store lists that open in Maps, with a GPS pill /
 * enable button. Self-contained: owns its location + Maps logic so any screen can
 * drop it in. Falls back to locale-based region when GPS is unavailable.
 */
export default function NearbyStores() {
  const { location, isResolving, requestAndResolve } = useLocation();
  // Store suggestions follow the user's REAL location (GPS), not the phone language.
  const region = useMemo(() => getStoreRegion(), [location]);

  const groceryStores = getRegionStores(region).slice(0, 6);
  const specialtyStores = getRegionSpecialtyStores(region);
  const localMarkets = getRegionLocalMarkets(region);

  const locationLabel = useMemo(() => {
    if (!location) return null;
    const parts: string[] = [];
    if (location.city) parts.push(location.city);
    if (location.subregion && location.subregion !== location.city) parts.push(location.subregion);
    return parts.join(', ') || null;
  }, [location]);

  const handleEnableLocation = useCallback(async () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await requestAndResolve();
    if (!result && Platform.OS !== 'web') {
      Alert.alert(
        pick({ en: 'Location unavailable', fr: 'Localisation indisponible', ko: '위치를 사용할 수 없음' }),
        pick({
          en: 'Enable location access in Settings to see stores near you.',
          fr: "Active l'accès à la localisation dans les Réglages pour voir les magasins près de toi.",
          ko: '주변 매장을 보려면 설정에서 위치 접근을 허용하세요.',
        }),
        [
          { text: pick({ en: 'Cancel', fr: 'Annuler', ko: '취소' }), style: 'cancel' },
          {
            text: pick({ en: 'Open Settings', fr: 'Ouvrir les Réglages', ko: '설정 열기' }),
            onPress: () => { void Linking.openSettings(); },
          },
        ],
      );
    }
  }, [requestAndResolve]);

  const handleRefreshLocation = useCallback(async () => {
    if (Platform.OS === 'web' || isResolving) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await requestAndResolve();
  }, [isResolving, requestAndResolve]);

  // Opens the store in the native Maps app, searching for it near the user's detected
  // city. Strips parenthetical notes like "Target (organic)" first.
  const handleOpenStoreInMaps = useCallback(async (storeName: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cleanName = storeName.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    const locationPart = locationLabel ? ` ${locationLabel}` : '';
    const query = encodeURIComponent(`${cleanName}${locationPart}`.trim());
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    const primary = Platform.select({
      ios: `http://maps.apple.com/?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: webUrl,
    }) ?? webUrl;
    try {
      await Linking.openURL(primary);
    } catch {
      try {
        await Linking.openURL(webUrl);
      } catch (e) {
        console.log('[NearbyStores] Could not open store in maps:', e);
      }
    }
  }, [locationLabel]);

  const storeIcon = <Store color="#2E9E34" size={14} strokeWidth={2} />;

  return (
    <View style={styles.card}>
      {locationLabel ? (
        <TouchableOpacity
          style={styles.locationPill}
          onPress={handleRefreshLocation}
          activeOpacity={0.75}
          disabled={isResolving}
          testID="meal-refresh-location"
        >
          <MapPin color="#2E9E34" size={13} />
          <Text style={styles.locationPillText} numberOfLines={1}>
            {pick({ en: 'Near', fr: 'Proche de', ko: '내 주변' })} {locationLabel}
          </Text>
          {isResolving ? (
            <ActivityIndicator size="small" color="#2E9E34" />
          ) : (
            <LocateFixed color="#2E9E34" size={13} />
          )}
        </TouchableOpacity>
      ) : Platform.OS !== 'web' ? (
        <TouchableOpacity
          style={styles.enableLocationButton}
          onPress={handleEnableLocation}
          activeOpacity={0.85}
          disabled={isResolving}
          testID="meal-enable-location"
        >
          <MapPin color="#FFFFFF" size={15} />
          <Text style={styles.enableLocationText}>
            {isResolving
              ? pick({ en: 'Locating…', fr: 'Localisation…', ko: '위치 찾는 중…' })
              : pick({ en: 'Stores near me', fr: 'Magasins près de moi', ko: '내 주변 매장' })}
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.mapsHintRow}>
        <Navigation color="#2E9E34" size={12} />
        <Text style={styles.mapsHintText}>
          {pick({
            en: 'Tap a store to open it in Maps',
            fr: 'Touche un magasin pour l\u2019ouvrir dans Plans',
            ko: '매장을 누르면 지도에서 열립니다',
          })}
        </Text>
      </View>

      {groceryStores.length > 0 ? (
        <>
          <Text style={styles.subtitle}>{pick({ en: 'Grocery stores', fr: 'Épiceries', ko: '마트' })}</Text>
          {groceryStores.map((s, i) => (
            <StoreRow key={`groc-${i}`} name={s} icon={storeIcon} onPress={handleOpenStoreInMaps} />
          ))}
        </>
      ) : null}

      {specialtyStores.length > 0 ? (
        <>
          <Text style={styles.subtitle}>
            {pick({ en: 'Organic & health stores', fr: 'Magasins bio & santé', ko: '유기농·건강식품 매장' })}
          </Text>
          {specialtyStores.map((s, i) => (
            <StoreRow key={`spec-${i}`} name={s} icon={storeIcon} onPress={handleOpenStoreInMaps} />
          ))}
        </>
      ) : null}

      {localMarkets.length > 0 ? (
        <>
          <Text style={styles.subtitle}>{pick({ en: 'Local markets', fr: 'Marchés locaux', ko: '동네 시장' })}</Text>
          {localMarkets.map((m, i) => (
            <StoreRow
              key={`mkt-${i}`}
              name={m}
              icon={<MapPin color="#2E9E34" size={14} strokeWidth={2} />}
              onPress={handleOpenStoreInMaps}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#E8F9ED', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.25)' },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#DBF3E2', borderRadius: 999,
    marginBottom: 10, borderWidth: 1, borderColor: '#C7EBD0',
  },
  locationPillText: { fontSize: 12, fontWeight: '700' as const, color: '#1F6B2A', letterSpacing: -0.1, maxWidth: 220 },
  enableLocationButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#2E9E34', borderRadius: 999, marginBottom: 12,
    shadowColor: '#2E9E34', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 3,
  },
  enableLocationText: { fontSize: 12.5, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: -0.1 },
  mapsHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: 2 },
  mapsHintText: { flex: 1, fontSize: 12, color: '#3F7A48', fontWeight: '600' as const, fontStyle: 'italic' as const },
  subtitle: { fontSize: 14, fontWeight: '700' as const, color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  storeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 11,
    marginBottom: 6, backgroundColor: '#FFFFFF', borderRadius: 11, borderWidth: 1, borderColor: 'rgba(46, 158, 52, 0.18)',
  },
  storeRowText: { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '600' as const },
});
