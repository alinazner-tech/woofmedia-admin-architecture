import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { vi } from 'vitest';
import { createGateway } from '../mock/gateway';
import { session } from '../src/shared/session/token';

/**
 * Справжній API-клієнт застосунку + fetch, який іде прямо в еталонний мок шлюзу.
 * Мережі немає, але кожен запит проходить через той самий контракт, що й у dev-стенді.
 * Повертає gateway (щоб «покласти» сервіс) і spy на fetch (щоб рахувати запити).
 */
export function wireGateway(userId: string | null) {
  const gw = createGateway();
  const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    return gw.handle(new Request(new URL(url, 'http://localhost'), init));
  });
  vi.stubGlobal('fetch', fetchSpy);
  session.set(userId ? `tok_${userId}` : null);
  return { gw, fetchSpy };
}

/** Запити, що дійшли до шлюзу, у вигляді «МЕТОД /шлях». */
export function calls(fetchSpy: ReturnType<typeof vi.fn>): string[] {
  return fetchSpy.mock.calls.map(([input, init]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    return `${(init as RequestInit | undefined)?.method ?? 'GET'} ${new URL(url, 'http://localhost').pathname}`;
  });
}

export function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

export function renderRoutes(routes: RouteObject[], initialPath: string, qc = testQueryClient()) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const utils = render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...utils, router, qc };
}

export function renderWithClient(ui: ReactElement, qc = testQueryClient()) {
  return { ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>), qc };
}
