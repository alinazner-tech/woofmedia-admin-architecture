import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { buildRoutes, navItems, type RouteDef } from '../../src/app/routes';
import { makeCan } from '../../src/shared/session/can';
import type { Capability } from '../../src/entities/user/types';
import { renderRoutes } from '../helpers';

// Б-3 (ФЕ, рівень охоронця): можливість перевіряється ДО import().
// Недозволений маршрут не викликає load() ніколи — отже chunk не запитується,
// а людина бачить 404 оболонки. Рівень збірки перевіряє scripts/check-chunks.ts.

function defsWithSpies() {
  const Page = (name: string) => ({ default: () => <h1>{name}</h1> });
  const load = {
    queue: vi.fn(async () => Page('Черга')),
    finance: vi.fn(async () => Page('Фінанси')),
    prompts: vi.fn(async () => Page('Промпти')),
  };
  const defs: RouteDef[] = [
    { path: 'queue', need: 'projects.read', nav: 'Черга', load: load.queue },
    { path: 'finance', need: 'finance.read', nav: 'Фінанси', load: load.finance },
    { path: 'prompts', need: 'prompts.read', nav: 'Промпти', load: load.prompts },
  ];
  return { defs, load };
}

const SPECIALIST: Capability[] = ['projects.read'];
const SUPER: Capability[] = ['projects.read', 'finance.read', 'prompts.read'];

describe('Б-3: модулі за можливостями', () => {
  it('спеціаліст на прямому переході /finance бачить 404, а chunk фінансів не вантажиться', async () => {
    const { defs, load } = defsWithSpies();
    renderRoutes(buildRoutes(defs, makeCan(SPECIALIST)), '/finance');

    expect(await screen.findByText('Сторінку не знайдено')).toBeInTheDocument();
    expect(load.finance).not.toHaveBeenCalled();
    expect(load.prompts).not.toHaveBeenCalled();
  });

  it('дозволений маршрут вантажиться лениво і лише при переході на нього', async () => {
    const { defs, load } = defsWithSpies();
    renderRoutes(buildRoutes(defs, makeCan(SUPER)), '/finance');

    expect(await screen.findByRole('heading', { name: 'Фінанси' })).toBeInTheDocument();
    expect(load.finance).toHaveBeenCalledOnce();
    expect(load.prompts).not.toHaveBeenCalled();
  });

  it('меню будується з того ж реєстру: спеціаліст не бачить адмінських пунктів', () => {
    const { defs } = defsWithSpies();
    expect(navItems(defs, makeCan(SPECIALIST)).map((n) => n.label)).toEqual(['Черга']);
    expect(navItems(defs, makeCan(SUPER)).map((n) => n.label)).toEqual(['Черга', 'Фінанси', 'Промпти']);
  });
});
