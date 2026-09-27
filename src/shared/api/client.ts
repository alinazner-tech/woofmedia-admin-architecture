import { session } from '../session/token';
import { serverClock } from '../lib/serverClock';
import { ApiError, type Problem } from './errors';

// Власний клієнт поверх fetch (~80 рядків замість генерованого).
// - додає access-токен і таймаут;
// - на 401 один раз оновлює токен (одне оновлення на весь браузер) і повторює;
// - розбирає problem+json у ApiError з полем service, щоб UI знав, яку секцію деградувати;
// - з кожної відповіді бере заголовок Date для поправки годинника.

export interface ApiClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T>;
  refresh(): Promise<boolean>;
}

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const doFetch = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  async function raw(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    if (session.token) headers.set('Authorization', `Bearer ${session.token}`);
    if (init.body !== undefined) headers.set('Content-Type', 'application/json');
    try {
      const res = await doFetch(opts.baseUrl + path, {
        ...init,
        headers,
        credentials: 'include',
        signal: AbortSignal.timeout(timeoutMs),
      });
      serverClock.observe(res.headers.get('Date'));
      return res;
    } catch (e) {
      const timeout = e instanceof DOMException && e.name === 'TimeoutError';
      throw new ApiError({
        status: 0,
        code: timeout ? 'timeout' : 'network',
        title: timeout ? 'Сервер не відповів вчасно' : 'Немає звʼязку з сервером',
      });
    }
  }

  async function toError(res: Response): Promise<ApiError> {
    let p: Partial<Problem> = {};
    try {
      p = await res.json();
    } catch {
      /* тіло не problem+json */
    }
    return new ApiError({
      status: res.status,
      code: p.code ?? `http_${res.status}`,
      title: p.title ?? res.statusText,
      service: p.service,
      requestId: p.requestId,
      currentStatus: p.currentStatus,
    });
  }

  async function refreshOnce(): Promise<boolean> {
    const run = async () => {
      const res = await raw('/auth/refresh', { method: 'POST' });
      if (!res.ok) return false;
      const { accessToken } = (await res.json()) as { accessToken: string };
      session.set(accessToken);
      return true;
    };
    // Web Locks: дві вкладки не ротують refresh-токен одночасно (ADR-5).
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks ? locks.request('woof-auth-refresh', run) : run();
  }

  async function request<T>(path: string, init: RequestInit, retried = false): Promise<T> {
    const res = await raw(path, init);
    if (res.status === 401 && !retried && (await refreshOnce())) {
      return request<T>(path, init, true);
    }
    if (res.status === 401) opts.onUnauthorized?.();
    if (!res.ok) {
      const err = await toError(res);
      if (res.status === 403) opts.onForbidden?.();
      throw err;
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body, headers) =>
      request(path, { method: 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) }),
    refresh: refreshOnce,
  };
}
