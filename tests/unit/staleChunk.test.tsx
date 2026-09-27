import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Outlet } from 'react-router';
import { buildRoutes, type RouteDef } from '../../src/app/routes';
import { renderRoutes } from '../helpers';

// Б-15 на рівні маршрутизатора: застарілий chunk і збій рендеру модуля
// не дають порожньої області — меню (оболонка) лишається.

const shell = (children: ReturnType<typeof buildRoutes>) => [
  { path: '/', element: <div><nav>меню</nav><Outlet /></div>, children },
];

describe('Б-15: помилки завантаження й рендеру модуля', () => {
  it('chunk не завантажився → «вийшла нова версія», меню на місці', async () => {
    const defs: RouteDef[] = [{
      path: 'finance', need: null,
      load: () => Promise.reject(new TypeError('Failed to fetch dynamically imported module: /assets/finance-x.js')),
    }];
    renderRoutes(shell(buildRoutes(defs, () => true)), '/finance');
    expect(await screen.findByRole('heading', { name: 'Вийшла нова версія панелі' })).toBeInTheDocument();
    expect(screen.getByText('меню')).toBeInTheDocument();
  });

  it('модуль упав під час рендеру → повідомлення замість білої області, меню на місці', async () => {
    const Broken = () => { throw new Error('boom'); };
    const defs: RouteDef[] = [{ path: 'prompts', need: null, load: async () => ({ default: Broken }) }];
    renderRoutes(shell(buildRoutes(defs, () => true)), '/prompts');
    expect(await screen.findByRole('heading', { name: 'Щось пішло не так на цій сторінці' })).toBeInTheDocument();
    expect(screen.getByText('меню')).toBeInTheDocument();
  });
});
