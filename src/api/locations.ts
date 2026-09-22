import { appConfig } from '../config/appConfig';

export type PlaceSuggestion = {
  placeId?: string;
  label?: string;
  city?: string;
  description: string;
};

export type CitySuggestion = PlaceSuggestion;

async function searchLocationSuggestions(
  endpoint: 'places' | 'cities',
  responseKey: 'places' | 'cities',
  query: string,
  options: { signal?: AbortSignal } = {},
) {
  const controller = new AbortController();
  let didTimeout = false;
  const timeout = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, appConfig.apiTimeoutMs);
  const abortFromCaller = () => controller.abort();

  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const params = new URLSearchParams({ query });
  let response: Response;
  try {
    response = await fetch(`${appConfig.apiBaseUrl}/locations/${endpoint}?${params.toString()}`, {
      headers: {
        'X-Jambit-Client': 'app',
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (didTimeout) {
      throw new Error(`${endpoint === 'cities' ? 'City' : 'Place'} search timed out.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: string }).message)
        : `${endpoint === 'cities' ? 'City' : 'Place'} search failed.`;
    throw new Error(message);
  }

  return ((payload as Record<typeof responseKey, PlaceSuggestion[] | undefined>)[responseKey] || []).filter(
    (place) => place.description,
  );
}

export async function searchPlaces(query: string, options: { signal?: AbortSignal } = {}) {
  return searchLocationSuggestions('places', 'places', query, options);
}

export async function searchCities(query: string, options: { signal?: AbortSignal } = {}) {
  return searchLocationSuggestions('cities', 'cities', query, options);
}
