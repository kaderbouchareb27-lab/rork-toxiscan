import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { ScannedProduct, RiskGroup } from '@/types';

const STORAGE_KEY = 'toxiscan_history';

export const [ScanHistoryProvider, useScanHistory] = createContextHook(() => {
  const [history, setHistory] = useState<ScannedProduct[]>([]);
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['scanHistory'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as ScannedProduct[]) : [];
    },
  });

  useEffect(() => {
    if (historyQuery.data) {
      setHistory(historyQuery.data);
    }
  }, [historyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: ScannedProduct[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['scanHistory'] });
    },
  });

  const addProduct = useCallback((product: ScannedProduct) => {
    setHistory(prev => {
      const filtered = prev.filter(p => p.barcode !== product.barcode);
      const updated = [product, ...filtered];
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const toggleFavorite = useCallback((barcode: string) => {
    setHistory(prev => {
      const updated = prev.map(p =>
        p.barcode === barcode ? { ...p, isFavorite: !p.isFavorite } : p
      );
      saveMutation.mutate(updated);
      return updated;
    });
    console.log('[ScanHistory] Toggled favorite for:', barcode);
  }, [saveMutation]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveMutation.mutate([]);
  }, [saveMutation]);

  const favorites = useMemo(() => {
    return history.filter(p => p.isFavorite);
  }, [history]);

  const stats = useMemo(() => {
    const total = history.length;
    const danger = history.filter(p => p.riskGroup === 'group1').length;
    const probable = history.filter(p => p.riskGroup === 'group2a').length;
    const possible = history.filter(p => p.riskGroup === 'group2b').length;
    const safe = history.filter(p => p.riskGroup === 'none').length;
    return { total, danger, probable, possible, safe };
  }, [history]);

  return useMemo(() => ({
    history,
    favorites,
    addProduct,
    toggleFavorite,
    clearHistory,
    stats,
    isLoading: historyQuery.isLoading,
  }), [history, favorites, addProduct, toggleFavorite, clearHistory, stats, historyQuery.isLoading]);
});

const FREE_HISTORY_LIMIT = 3;

export function useFilteredHistory(filter: RiskGroup | 'all' | 'favorites', isPro: boolean) {
  const { history, favorites } = useScanHistory();
  return useMemo(() => {
    if (filter === 'favorites') {
      return isPro ? favorites : [];
    }
    const source = isPro ? history : history.slice(0, FREE_HISTORY_LIMIT);
    if (filter === 'all') return source;
    return source.filter(p => p.riskGroup === filter);
  }, [history, favorites, filter, isPro]);
}
