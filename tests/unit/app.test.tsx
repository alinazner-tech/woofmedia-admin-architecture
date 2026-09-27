import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/app/App';
import { session } from '../../src/shared/session/token';
import { wireGateway } from '../helpers';

// Застосунок цілком, від старту до меню. Мок шлюзу — через fetch.

afterEach(() => {
  vi.unstubAllGlobals();
  session.set(null);
  window.history.replaceState(null, '', '/');
});

describe('Б-7м: межа інваріанту — лежить сам шлюз', () => {
  it('усі запити падають мережевою помилкою → зрозумілий екран, а не білий', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    render(<App />);
    expect(await screen.findByText('Панель тимчасово недоступна')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Спробувати зараз' })).toBeInTheDocument();
  });
});

describe('Вхід і меню за можливостями', () => {
  it('спеціаліст після входу бачить лише «Черга»; супер-адмін — усі розділи', async () => {
    wireGateway(null);
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /Олена — спеціаліст/ }));

    const nav = await screen.findByRole('navigation');
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Черга']);
    expect(await screen.findByRole('heading', { name: 'Черга проєктів' })).toBeInTheDocument();
    // Обсяг — з токена: у черзі спеціаліста лише її проєкти.
    expect(await screen.findByText('Пошукова реклама для стоматології')).toBeInTheDocument();
    expect(screen.queryByText('Реклама автосервісу')).not.toBeInTheDocument();
  });

  it('супер-адмін бачить усі розділи', async () => {
    wireGateway(null);
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /Андрій — супер-адмін/ }));
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Черга', 'Промпти', 'Моніторинг', 'Фінанси']);
  });
});

describe('Б-16: зміна ролі враховується без перезапуску (лише UX)', () => {
  it('403 → повторний /me з меншими можливостями → меню перебудовано', async () => {
    const { gw } = wireGateway(null);
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /Андрій — супер-адмін/ }));
    const nav = await screen.findByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Фінанси' })).toBeInTheDocument();

    // Бекенд позбавив користувача фінансів посеред сесії.
    const original = gw.handle;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(new URL(String(input), 'http://localhost'), init);
      if (new URL(req.url).pathname === '/api/me') {
        const me = await (await original(req)).json();
        me.capabilities = me.capabilities.filter((c: string) => c !== 'finance.read');
        return new Response(JSON.stringify(me), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (new URL(req.url).pathname === '/api/finance/summary') {
        return new Response(JSON.stringify({ title: 'Недостатньо прав', status: 403, code: 'forbidden', service: 'billing' }), { status: 403 });
      }
      return original(req);
    }));

    await userEvent.click(within(nav).getByRole('link', { name: 'Фінанси' }));
    // Після 403 застосунок сам перезапитує /me і прибирає пункт меню.
    await vi.waitFor(() => {
      const links = within(screen.getByRole('navigation')).getAllByRole('link').map((a) => a.textContent);
      expect(links).not.toContain('Фінанси');
    });
  });
});
