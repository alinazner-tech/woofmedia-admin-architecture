import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { api, setForbiddenHandler } from '../shared/api/instance';
import { isApiError } from '../shared/api/errors';
import { session } from '../shared/session/token';
import { makeCan } from '../shared/session/can';
import { createTabSync, registerTabSync, type TabSync } from '../shared/lib/tabSync';
import type { Me } from '../entities/user/types';
import { buildRoutes, navItems, routeDefs } from './routes';
import { Shell } from './Shell';
import { LoginPage } from './LoginPage';
import { GatewayDownPage } from './errors/GatewayDownPage';
import { NotFoundPage } from './errors/NotFoundPage';
import { createQueryClient } from './queryClient';

const queryClient = createQueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  );
}

type Phase = 'booting' | 'anonymous' | 'authed' | 'unreachable';

function Root() {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>('booting');
  const syncRef = useRef<TabSync | null>(null);

  // Нова вкладка: пробуємо відновити сесію через refresh-cookie (+1 запит, ADR-5).
  const boot = () => {
    api
      .refresh()
      .then((ok) => setPhase(ok ? 'authed' : 'anonymous'))
      .catch((e) => setPhase(isApiError(e) && e.isUnreachable ? 'unreachable' : 'anonymous'));
  };
  useEffect(boot, []);

  useEffect(() => {
    if (phase !== 'authed') return;
    const sync = createTabSync(qc, () => {
      session.set(null);
      setPhase('anonymous');
    });
    registerTabSync(sync);
    syncRef.current = sync;
    setForbiddenHandler(() => qc.invalidateQueries({ queryKey: ['me'] }));
    return () => {
      registerTabSync(null);
      syncRef.current = null;
      setForbiddenHandler(null);
      sync.close();
    };
  }, [phase, qc]);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/me'),
    enabled: phase === 'authed',
    staleTime: 5 * 60_000,
    refetchInterval: (q) => (q.state.error ? 30_000 : false),
  });

  if (phase === 'booting') return <div className="page page--center muted">Завантаження…</div>;
  if (phase === 'unreachable') return <GatewayDownPage onRetry={boot} />;
  // Нова особа — жодних даних попередньої: кеш очищується при КОЖНОМУ вході,
  // а не лише при виході (знайдено тестом: інакше меню й дані минулого користувача
  // переживали повторний вхід на спільному компʼютері).
  const onLoggedIn = () => {
    qc.clear();
    setPhase('authed');
  };

  if (phase === 'anonymous') return <LoginPage onLoggedIn={onLoggedIn} />;

  if (me.isError) {
    if (isApiError(me.error) && me.error.status === 401) {
      session.set(null);
      return <LoginPage onLoggedIn={onLoggedIn} />;
    }
    return <GatewayDownPage onRetry={() => me.refetch()} />;
  }
  if (!me.data) return <div className="page page--center muted">Завантаження…</div>;

  const logout = async () => {
    // Б-10: вихід розсилається іншим вкладкам ДО того, як канал закриється.
    // (Знайдено e2e-тестом: механізм був, але кнопка «Вийти» його не викликала.)
    syncRef.current?.logout();
    try {
      await api.post('/auth/logout');
    } finally {
      session.set(null);
      qc.clear();
      setPhase('anonymous');
    }
  };

  return <AuthedApp me={me.data} onLogout={logout} />;
}

function AuthedApp({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const capKey = me.capabilities.join(',');
  const router = useMemo(() => {
    const can = makeCan(me.capabilities);
    return createBrowserRouter([
      {
        path: '/',
        element: <Shell me={me} nav={navItems(routeDefs, can)} onLogout={onLogout} />,
        children: [
          { index: true, element: <Navigate to="/queue" replace /> },
          ...buildRoutes(routeDefs, can),
          { path: '*', Component: NotFoundPage },
        ],
      },
    ]);
    // Роутер перебудовується, коли змінився склад можливостей (Б-16).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id, capKey]);

  return <RouterProvider router={router} />;
}
