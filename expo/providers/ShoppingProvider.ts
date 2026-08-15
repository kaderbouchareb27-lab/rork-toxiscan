import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import type { ShoppingItem } from '@/utils/shopping';
import { averageShoppingScore, manualShoppingItem, alternativeShoppingItem } from '@/utils/shopping';

const SESSIONS_STORAGE_KEY = 'toxiscan_shopping_sessions';

/** Session de courses terminée, archivée dans l'Historique. */
export interface ArchivedShoppingSession {
  id: string;
  endedAt: string;
  items: ShoppingItem[];
  score: number;
}

/**
 * État de la session « Mode courses » : la liste en cours (mémoire) + les
 * sessions archivées (AsyncStorage). Une seule session active à la fois.
 */
export const [ShoppingProvider, useShopping] = createContextHook(() => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [sessions, setSessions] = useState<ArchivedShoppingSession[]>([]);

  // Recharge les sessions archivées au démarrage.
  useEffect(() => {
    AsyncStorage.getItem(SESSIONS_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as ArchivedShoppingSession[];
          if (Array.isArray(parsed)) setSessions(parsed);
        }
      })
      .catch(() => {});
  }, []);

  const persistSessions = useCallback((next: ArchivedShoppingSession[]) => {
    setSessions(next);
    AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const startSession = useCallback(() => {
    setItems([]);
    setIsActive(true);
  }, []);

  const addItem = useCallback((item: ShoppingItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const addManualFood = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, manualShoppingItem(trimmed)]);
  }, []);

  const addAlternative = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, alternativeShoppingItem(trimmed)]);
  }, []);

  const replaceItem = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) => prev.map((item) =>
      item.id === id
        ? { ...alternativeShoppingItem(trimmed), id: item.id, checked: item.checked }
        : item,
    ));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleChecked = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
  }, []);

  /** Archive la session active puis la réinitialise. */
  const endSession = useCallback((): ArchivedShoppingSession | null => {
    if (items.length === 0) {
      setItems([]);
      setIsActive(false);
      return null;
    }
    const session: ArchivedShoppingSession = {
      id: `session_${Date.now()}`,
      endedAt: new Date().toISOString(),
      items,
      score: averageShoppingScore(items),
    };
    persistSessions([session, ...sessions]);
    setItems([]);
    setIsActive(false);
    return session;
  }, [items, sessions, persistSessions]);

  const averageScore = useMemo(() => averageShoppingScore(items), [items]);

  return useMemo(() => ({
    items,
    isActive,
    sessions,
    averageScore,
    startSession,
    addItem,
    addManualFood,
    addAlternative,
    replaceItem,
    removeItem,
    toggleChecked,
    endSession,
  }), [
    items, isActive, sessions, averageScore,
    startSession, addItem, addManualFood, addAlternative, replaceItem, removeItem, toggleChecked, endSession,
  ]);
});
