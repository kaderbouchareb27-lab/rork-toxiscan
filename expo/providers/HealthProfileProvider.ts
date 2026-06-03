import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import {
  HealthProfile,
  HealthPrefId,
  EMPTY_HEALTH_PROFILE,
  setCachedHealthProfile,
} from '@/utils/healthProfile';

const HEALTH_PROFILE_KEY = 'toxiscan_health_profile_v1';

/**
 * Persists Dr. Toxi's "profile memory" — the user's situation and food
 * priorities — and keeps the {@link setCachedHealthProfile} module cache in
 * sync so the chat + scan prompt builders can read it without React. The
 * profile is OPTIONAL and lives only on the device.
 */
export const [HealthProfileProvider, useHealthProfile] = createContextHook(() => {
  const [profile, setProfile] = useState<HealthProfile>(EMPTY_HEALTH_PROFILE);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(HEALTH_PROFILE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<HealthProfile>;
          const safe: HealthProfile = {
            prefs: Array.isArray(parsed.prefs) ? (parsed.prefs as HealthPrefId[]) : [],
            note: typeof parsed.note === 'string' ? parsed.note : '',
          };
          setProfile(safe);
          setCachedHealthProfile(safe);
          console.log('[HealthProfile] Hydrated:', safe.prefs.length, 'prefs, note:', safe.note.length > 0);
        }
      } catch (e) {
        console.log('[HealthProfile] Hydrate error:', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const save = useCallback((next: HealthProfile) => {
    setProfile(next);
    setCachedHealthProfile(next);
    void AsyncStorage.setItem(HEALTH_PROFILE_KEY, JSON.stringify(next)).catch((e) =>
      console.log('[HealthProfile] Save error:', e),
    );
  }, []);

  const togglePref = useCallback(
    (id: HealthPrefId) => {
      const has = profile.prefs.includes(id);
      const prefs = has ? profile.prefs.filter((p) => p !== id) : [...profile.prefs, id];
      save({ ...profile, prefs });
    },
    [profile, save],
  );

  const setNote = useCallback(
    (note: string) => {
      save({ ...profile, note });
    },
    [profile, save],
  );

  const clearProfile = useCallback(() => {
    save(EMPTY_HEALTH_PROFILE);
  }, [save]);

  const activeCount = useMemo(
    () => profile.prefs.length + (profile.note.trim().length > 0 ? 1 : 0),
    [profile],
  );

  return useMemo(
    () => ({ profile, isLoaded, activeCount, togglePref, setNote, clearProfile }),
    [profile, isLoaded, activeCount, togglePref, setNote, clearProfile],
  );
});
