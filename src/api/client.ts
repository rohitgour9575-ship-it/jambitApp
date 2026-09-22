import { appConfig } from '../config/appConfig';

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
  timeoutMs?: number;
};

export class ApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

const retryableStatuses = new Set([502, 503, 504]);

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? appConfig.apiTimeoutMs);
    let response: Response;

    try {
      response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Jambit-Client': 'app',
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      if (attempt + 1 < maxAttempts) {
        await wait(attempt === 0 ? 350 : 900);
        continue;
      }

      throw new ApiError('Please try again.');
    }

    clearTimeout(timeout);
    const payload = await response.json().catch(() => ({}));

    if (response.ok) {
      return payload as T;
    }

    if (attempt + 1 < maxAttempts && retryableStatuses.has(response.status)) {
      await wait(attempt === 0 ? 350 : 900);
      continue;
    }

    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: string }).message)
        : 'Request failed.';
    throw new ApiError(message, response.status, payload);
  }

  throw new ApiError('Please try again.');
}
