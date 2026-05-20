import * as Location from 'expo-location';
import { getDeviceLanguage, isEnglish } from '@/utils/i18n';
import { detectRegion } from '@/utils/regionDetection';

export interface NearbyStore {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number;
  types: string[];
}

export type NearbyStoresErrorCode = 'missing_functions_url' | 'permission_denied' | 'location_unavailable' | 'api_error';

export class NearbyStoresError extends Error {
  code: NearbyStoresErrorCode;

  constructor(code: NearbyStoresErrorCode, message: string) {
    super(message);
    this.name = 'NearbyStoresError';
    this.code = code;
  }
}

function getFunctionsUrl(): string {
  const rawUrl = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL;
  if (!rawUrl) {
    throw new NearbyStoresError(
      'missing_functions_url',
      isEnglish() ? 'Nearby store search is not configured.' : 'La recherche de magasins proches n’est pas configurée.',
    );
  }
  return rawUrl.replace(/\/$/, '');
}

function getPlacesLanguageCode(): 'fr' | 'en' {
  const region = detectRegion();
  if (region.region === 'quebec') return 'fr';
  return getDeviceLanguage();
}

/**
 * Requests foreground location permission and loads real nearby organic/health stores
 * through the protected backend endpoint. The Google Maps API key never reaches the app bundle.
 */
export async function fetchNearbyHealthyStores(): Promise<NearbyStore[]> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new NearbyStoresError(
      'permission_denied',
      isEnglish()
        ? 'Location permission is needed to find real stores near you.'
        : 'La localisation est nécessaire pour trouver les vrais magasins près de vous.',
    );
  }

  let position: Location.LocationObject;
  try {
    position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    throw new NearbyStoresError(
      'location_unavailable',
      isEnglish()
        ? 'Unable to detect your current location right now.'
        : 'Impossible de détecter votre position actuelle pour le moment.',
    );
  }

  const region = detectRegion();
  const response = await fetch(`${getFunctionsUrl()}/nearby-stores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      radiusMeters: 10000,
      languageCode: getPlacesLanguageCode(),
      regionCode: region.regionCode || undefined,
    }),
  });

  if (!response.ok) {
    throw new NearbyStoresError(
      'api_error',
      isEnglish()
        ? 'Unable to load nearby healthy stores.'
        : 'Impossible de charger les magasins santé à proximité.',
    );
  }

  const data = (await response.json()) as { stores?: NearbyStore[] };
  return Array.isArray(data.stores) ? data.stores : [];
}

export function isNearbyStoresError(error: unknown): error is NearbyStoresError {
  return error instanceof NearbyStoresError;
}

export function formatStoreDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters)) return '';
  if (distanceMeters < 1000) return `${Math.max(50, Math.round(distanceMeters / 50) * 50)} m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10000 ? 1 : 0)} km`;
}
