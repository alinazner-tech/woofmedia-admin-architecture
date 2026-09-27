import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createApiClient } from '../../src/shared/api/client';
import { ApiError } from '../../src/shared/api/errors';
import { session } from '../../src/shared/session/token';
import { serverClock } from '../../src/shared/lib/serverClock';

// API-клієнт: problem+json → ApiError, одне оновлення токена на 401, мережа → status 0.

const problem = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/problem+json' } });

describe('API-клієнт', () => {
  beforeEach(() => {
    session.set('old');
    serverClock.reset();
  });

  it('розбирає problem+json у ApiError з назвою сервісу', async () => {
    const api = createApiClient({
      baseUrl: '',
      fetchImpl: async () => problem(503, { title: 'Недоступно', status: 503, code: 'service_unavailable', service: 'checklists' }),
    });
    const err = await api.get('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 503, code: 'service_unavailable', service: 'checklists' });
  });

  it('на 401 один раз оновлює токен і повторює запит', async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('/auth/refresh')) return new Response(JSON.stringify({ accessToken: 'new' }), { status: 200 });
      const auth = new Headers(init?.headers).get('Authorization');
      return auth === 'Bearer new'
        ? new Response(JSON.stringify({ ok: true }), { status: 200 })
        : problem(401, { title: 'expired', status: 401, code: 'expired' });
    });
    const api = createApiClient({ baseUrl: '', fetchImpl });
    await expect(api.get('/data')).resolves.toEqual({ ok: true });
    expect(session.token).toBe('new');
    expect(fetchImpl.mock.calls.map(([u]) => String(u))).toEqual(['/data', '/auth/refresh', '/data']);
  });

  it('не зациклюється: якщо refresh не вдався — викликає onUnauthorized', async () => {
    const onUnauthorized = vi.fn();
    const api = createApiClient({
      baseUrl: '',
      onUnauthorized,
      fetchImpl: async () => problem(401, { title: 'no', status: 401, code: 'no_session' }),
    });
    await expect(api.get('/data')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('мережевий збій — ApiError зі status 0 (шлюз недосяжний)', async () => {
    const api = createApiClient({ baseUrl: '', fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
    const err = await api.get('/x').catch((e) => e);
    expect(err).toMatchObject({ status: 0, code: 'network', isUnreachable: true });
  });

  it('на 403 викликає onForbidden (перезапит /me, Б-16)', async () => {
    const onForbidden = vi.fn();
    const api = createApiClient({
      baseUrl: '',
      onForbidden,
      fetchImpl: async () => problem(403, { title: 'no', status: 403, code: 'forbidden' }),
    });
    await expect(api.get('/finance/summary')).rejects.toMatchObject({ status: 403 });
    expect(onForbidden).toHaveBeenCalledOnce();
  });

  it('бере поправку годинника із заголовка Date', async () => {
    const serverTime = Date.now() + 5 * 60_000;
    const api = createApiClient({
      baseUrl: '',
      fetchImpl: async () => new Response('{}', { status: 200, headers: { Date: new Date(serverTime).toUTCString() } }),
    });
    await api.get('/me');
    expect(Math.round(serverClock.offsetMs / 60_000)).toBe(5);
  });
});
