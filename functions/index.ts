// functions/index.ts — the entrypoint for your project's backend.

type Env = {
  GOOGLE_MAPS_API_KEY?: string;
};

type NearbyStoresRequest = {
  latitude?: unknown;
  longitude?: unknown;
  radiusMeters?: unknown;
  languageCode?: unknown;
  regionCode?: unknown;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  primaryType?: string;
};

type NearbyStore = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number;
  types: string[];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(body: unknown, status: number = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const earthRadiusMeters = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

function normalizeStores(places: GooglePlace[], latitude: number, longitude: number, radiusMeters: number): NearbyStore[] {
  const seen = new Set<string>();
  return places
    .map((place: GooglePlace): NearbyStore | null => {
      const name = place.displayName?.text?.trim();
      if (!name) return null;
      const lat = typeof place.location?.latitude === 'number' ? place.location.latitude : null;
      const lng = typeof place.location?.longitude === 'number' ? place.location.longitude : null;
      const distanceMeters = lat !== null && lng !== null ? haversineMeters(latitude, longitude, lat, lng) : radiusMeters;
      const id = place.id ?? `${name}-${place.formattedAddress ?? ''}`;
      return {
        id,
        name,
        address: place.formattedAddress ?? '',
        latitude: lat,
        longitude: lng,
        distanceMeters,
        types: place.types ?? [],
      };
    })
    .filter((store: NearbyStore | null): store is NearbyStore => {
      if (!store) return false;
      const key = `${store.name.toLowerCase()}|${store.address.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return store.distanceMeters <= radiusMeters + 250;
    })
    .sort((a: NearbyStore, b: NearbyStore) => a.distanceMeters - b.distanceMeters)
    .slice(0, 8);
}

async function searchNearbyStores(request: Request, env: Env): Promise<Response> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    return jsonResponse({ error: 'Google Maps API key is not configured.' }, 500);
  }

  let payload: NearbyStoresRequest;
  try {
    payload = (await request.json()) as NearbyStoresRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const latitude = toFiniteNumber(payload.latitude);
  const longitude = toFiniteNumber(payload.longitude);
  const rawRadius = toFiniteNumber(payload.radiusMeters) ?? 10000;
  const radiusMeters = Math.min(Math.max(rawRadius, 5000), 10000);
  const languageCode = typeof payload.languageCode === 'string' && payload.languageCode.length >= 2 ? payload.languageCode.slice(0, 2) : 'en';
  const regionCode = typeof payload.regionCode === 'string' && payload.regionCode.length >= 2 ? payload.regionCode.slice(0, 2).toUpperCase() : undefined;

  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return jsonResponse({ error: 'Invalid coordinates.' }, 400);
  }

  const textQuery = languageCode === 'fr'
    ? 'magasin bio alimentation biologique santé épicerie naturelle'
    : 'organic health food store natural grocery';

  const body: Record<string, unknown> = {
    textQuery,
    languageCode,
    maxResultCount: 12,
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: radiusMeters,
      },
    },
  };

  if (regionCode) body.regionCode = regionCode;

  const googleResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType',
    },
    body: JSON.stringify(body),
  });

  if (!googleResponse.ok) {
    const errorText = await googleResponse.text();
    console.error('[Places] Google error:', googleResponse.status, errorText.substring(0, 500));
    return jsonResponse({ error: 'Unable to fetch nearby stores.' }, 502);
  }

  const data = (await googleResponse.json()) as { places?: GooglePlace[] };
  const stores = normalizeStores(data.places ?? [], latitude, longitude, radiusMeters);
  return jsonResponse({ stores });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/ping') {
      return jsonResponse({ ok: true, now: new Date().toISOString() });
    }

    if (url.pathname === '/nearby-stores' && request.method === 'POST') {
      return searchNearbyStores(request, env);
    }

    return jsonResponse({ ok: true, hello: 'world' });
  },
};
