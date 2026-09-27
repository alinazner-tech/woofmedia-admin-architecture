import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import type { Capability } from '../entities/user/types';
import { NotFoundPage } from './errors/NotFoundPage';
import { ChunkLoadErrorPage, RouteErrorPage } from './errors/RouteErrorPage';

// ЄДИНЕ місце, де модулі імпортуються — і лише динамічно (розділ 2.3, ADR-3).
// Правило oxlint no-restricted-imports забороняє імпорт модулів будь-де ще,
// включно з динамічним (Б-8). Розбиття бандла — гігієна, а не захист.

export interface RouteDef {
  path: string;
  need: Capability | null; // null — доступно всім автентифікованим
  nav?: string; // підпис у меню: меню будується з того ж реєстру
  load: () => Promise<{ default: ComponentType }>;
}

export const routeDefs: RouteDef[] = [
  { path: 'queue', need: 'projects.read', nav: 'Черга', load: () => import('../modules/queue') },
  { path: 'projects/:id', need: 'projects.read', load: () => import('../modules/project') },
  { path: 'prompts', need: 'prompts.read', nav: 'Промпти', load: () => import('../modules/prompts') },
  { path: 'monitoring', need: 'monitoring.read', nav: 'Моніторинг', load: () => import('../modules/monitoring') },
  { path: 'finance', need: 'finance.read', nav: 'Фінанси', load: () => import('../modules/finance') },
];

/**
 * Охоронець маршрутів (RequireCapability у термінах документа).
 * Можливість перевіряється ДО виклику import(): для недозволеного маршруту
 * load() не викликається ніколи, chunk не запитується, а людина бачить 404
 * оболонки — не підтверджуємо навіть існування розділу (Б-3).
 */
export function buildRoutes(defs: RouteDef[], can: (c: Capability | null) => boolean): RouteObject[] {
  return defs.map((def) =>
    can(def.need)
      ? {
          path: def.path,
          errorElement: <RouteErrorPage />,
          lazy: async () => {
            try {
              return { Component: (await def.load()).default };
            } catch (error) {
              // Б-15: якщо chunk не завантажився (застарів після деплою), React Router
              // не показує errorElement маршруту — лишається порожня область.
              // Тому помилку завантаження обробляємо тут. (Знайдено e2e-тестом.)
              return { Component: () => <ChunkLoadErrorPage error={error} /> };
            }
          },
        }
      : { path: def.path, Component: NotFoundPage },
  );
}

export function navItems(defs: RouteDef[], can: (c: Capability | null) => boolean) {
  return defs.filter((d) => d.nav && can(d.need)).map((d) => ({ to: `/${d.path}`, label: d.nav! }));
}
