/**
 * Préchargement Bun pour les scripts d'audit : bouchonne les modules natifs
 * (react-native, expo-localization, AsyncStorage…) afin que les scripts puissent importer
 * LE VRAI code de l'app (utils/api.ts, constants/*) au lieu d'en recopier la logique.
 *
 * Usage : bun --preload ./scripts/lib/nativeStub.ts scripts/<script>.ts
 *
 * La langue simulée est l'anglais : les textes servis sont donc les textes de
 * référence anglais, ce qui rend les comparaisons avec les fiches officielles exactes.
 */
interface BunModuleResult {
  exports: Record<string, unknown>;
  loader: 'object';
}

interface BunPluginBuilder {
  module(specifier: string, callback: () => BunModuleResult): void;
}

interface BunRuntime {
  plugin(options: { name: string; setup: (build: BunPluginBuilder) => void }): void;
}

const bunRuntime = (globalThis as unknown as { Bun?: BunRuntime }).Bun;
if (!bunRuntime) throw new Error('nativeStub.ts doit être préchargé par Bun (--preload)');

const STUBS: Readonly<Record<string, Record<string, unknown>>> = {
  'expo-localization': { getLocales: () => [{ languageCode: 'en' }] },
  '@react-native-async-storage/async-storage': {
    default: {
      getItem: async (): Promise<string | null> => null,
      setItem: async (): Promise<void> => undefined,
      removeItem: async (): Promise<void> => undefined,
    },
  },
  'react-native': {
    Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios },
  },
  'expo-file-system': {},
  'expo-image-manipulator': {},
  'expo-constants': { default: {} },
};

bunRuntime.plugin({
  name: 'rn-stubs',
  setup(build: BunPluginBuilder) {
    for (const [specifier, exports] of Object.entries(STUBS)) {
      build.module(specifier, () => ({ exports, loader: 'object' }));
    }
  },
});
