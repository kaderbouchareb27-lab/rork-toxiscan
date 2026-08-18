import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { ScannedProduct, VerdictTier } from '@/types';
import { verdictTierFromProduct } from '@/utils/api';

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
    onSuccess: (data) => {
      queryClient.setQueryData(['scanHistory'], data);
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

  const updateProduct = useCallback((barcode: string, patch: Partial<ScannedProduct>) => {
    setHistory(prev => {
      const updated = prev.map(p =>
        p.barcode === barcode ? { ...p, ...patch, barcode: p.barcode } : p
      );
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
    // ✅ Verdict recalculé en direct (mêmes règles que la page produit) pour que
    // les stats et filtres restent cohérents avec le verdict affiché. Les 5 niveaux
    // sont comptés séparément (Ultra Toxique distinct de Cancérigène).
    const tiers = history.map(p => verdictTierFromProduct(p));
    const total = history.length;
    const carcinogenic = tiers.filter(t => t === 'carcinogenic').length;
    const ultraToxic = tiers.filter(t => t === 'ultra_toxic').length;
    const processed = tiers.filter(t => t === 'processed').length;
    const moderation = tiers.filter(t => t === 'moderation').length;
    const approved = tiers.filter(t => t === 'approved').length;
    return { total, carcinogenic, ultraToxic, processed, moderation, approved };
  }, [history]);

  return useMemo(() => ({
    history,
    favorites,
    addProduct,
    updateProduct,
    toggleFavorite,
    clearHistory,
    stats,
    isLoading: historyQuery.isLoading,
  }), [history, favorites, addProduct, updateProduct, toggleFavorite, clearHistory, stats, historyQuery.isLoading]);
});

// L'historique complet est visible pour tous : les scans en mode courses y sont
// enregistrés au même titre que les scans du menu accueil.

export function useFilteredHistory(filter: VerdictTier | 'all' | 'favorites', isPro: boolean) {
  const { history, favorites } = useScanHistory();
  return useMemo(() => {
    if (filter === 'favorites') {
      return isPro ? favorites : [];
    }
    if (filter === 'all') return history;
    return history.filter(p => verdictTierFromProduct(p) === filter);
  }, [history, favorites, filter, isPro]);
}
