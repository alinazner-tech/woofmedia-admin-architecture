import { describe, expect, it, afterEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectPage from '../../src/modules/project/ProjectPage';
import { calls, renderRoutes, wireGateway } from '../helpers';

const route = [{ path: 'projects/:id', Component: ProjectPage }];

afterEach(() => vi.unstubAllGlobals());

describe('Б-1ф: відмова в доступі показується коректно (лише UX)', () => {
  it('чужий проєкт → «не знайдено», жодних даних ні з відповіді, ні з вкладених блоків', async () => {
    wireGateway('spec-a');
    renderRoutes(route, '/projects/p-201'); // проєкт команди B

    expect(await screen.findByText('Проєкт не знайдено або він вам недоступний.')).toBeInTheDocument();
    expect(screen.queryByText('Реклама автосервісу')).not.toBeInTheDocument();
    expect(screen.queryByText('Мотор Плюс', { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Чек-лист')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Доступи до кабінетів')).not.toBeInTheDocument();
  });
});

describe('Б-7: падіння одного сервісу не кладе сторінку', () => {
  it('лежить сервіс чек-листів: блок чек-листа — заглушка з назвою сервісу, решта картки працює', async () => {
    const { gw } = wireGateway('spec-a');
    gw.state.down.add('checklists');
    renderRoutes(route, '/projects/p-101');

    const checklist = await screen.findByLabelText('Чек-лист');
    expect(await within(checklist).findByText(/Не відповідає сервіс чек-листів/)).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Пошукова реклама для стоматології' })).toBeInTheDocument();
    const notes = screen.getByLabelText('Нотатки');
    expect(await within(notes).findByText(/брендові запити/)).toBeInTheDocument();
  });

  it('лежить сервіс нотаток: інші блоки на місці', async () => {
    const { gw } = wireGateway('spec-a');
    gw.state.down.add('notes');
    renderRoutes(route, '/projects/p-101');

    const notes = await screen.findByLabelText('Нотатки');
    expect(await within(notes).findByText(/Не відповідає сервіс нотаток/)).toBeInTheDocument();
    const checklist = screen.getByLabelText('Чек-лист');
    expect(await within(checklist).findByText(/Доступ до кабінету/)).toBeInTheDocument();
  });
});

describe('Б-5ф: панель пропонує рівно allowedTransitions (лише UX)', () => {
  it('спеціаліст у стані «В роботі» бачить рівно два переходи з відповіді сервера', async () => {
    wireGateway('spec-a');
    renderRoutes(route, '/projects/p-101');

    await screen.findByRole('heading', { name: 'Пошукова реклама для стоматології' });
    const buttons = screen.getAllByRole('button', { name: /^→/ }).map((b) => b.textContent);
    expect(buttons).toEqual(['→ Потрібна інформація від клієнта', '→ На перевірці']);
  });

  it('спеціаліст на проєкті «На перевірці» не бачить кнопок прийняття — це дія тімліда', async () => {
    wireGateway('spec-a');
    renderRoutes(route, '/projects/p-103');
    await screen.findByRole('heading', { name: 'Запуск у TikTok' });
    expect(screen.queryAllByRole('button', { name: /^→/ })).toHaveLength(0);
    expect(screen.getByText('Для вас немає доступних переходів у цьому стані.')).toBeInTheDocument();
  });

  it('тімлід на тому ж проєкті бачить «прийняти» і «повернути»', async () => {
    wireGateway('lead-a');
    renderRoutes(route, '/projects/p-103');
    await screen.findByRole('heading', { name: 'Запуск у TikTok' });
    const buttons = screen.getAllByRole('button', { name: /^→/ }).map((b) => b.textContent);
    expect(buttons).toEqual(['→ Виконано', '→ В роботі']);
  });

  it('перехід, що вимагає коментаря, спершу просить коментар і лише потім шле запит', async () => {
    const { fetchSpy } = wireGateway('lead-a');
    renderRoutes(route, '/projects/p-103');
    await userEvent.click(await screen.findByRole('button', { name: '→ В роботі' }));

    expect(calls(fetchSpy)).not.toContain('POST /api/projects/p-103/transitions');
    await userEvent.type(screen.getByLabelText(/Коментар до переходу/), 'Не вистачає трьох заголовків');
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати' }));

    await waitFor(() => expect(screen.getByText('В роботі', { selector: '.status' })).toBeInTheDocument());
    expect(calls(fetchSpy).filter((c) => c.startsWith('POST'))).toEqual(['POST /api/projects/p-103/transitions']);
  });

  it('якщо сервер відхилив перехід (422) — показує причину й оновлює картку', async () => {
    const { gw, fetchSpy } = wireGateway('spec-a');
    renderRoutes(route, '/projects/p-101');
    const button = await screen.findByRole('button', { name: '→ На перевірці' });

    // Сервер відхиляє перехід за правилом, якого фронтенд не бачить.
    const forward = fetchSpy.getMockImplementation()!;
    fetchSpy.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'POST'
        ? new Response(JSON.stringify({ title: 'Цей перехід вам недоступний', status: 422, code: 'transition_not_allowed', service: 'projects' }),
            { status: 422, headers: { 'Content-Type': 'application/problem+json' } })
        : forward(input, init));
    void gw;

    await userEvent.click(button);
    expect(await screen.findByText('Цей перехід вам недоступний')).toBeInTheDocument();
    await waitFor(() => expect(calls(fetchSpy).filter((c) => c === 'GET /api/projects/p-101').length).toBeGreaterThan(1));
  });
});

describe('Б-6ф: конфлікт версій показується, дія не повторюється', () => {
  it('на 409 — банер із поточним статусом і рівно один запит мутації', async () => {
    const { gw, fetchSpy } = wireGateway('spec-a');
    renderRoutes(route, '/projects/p-101');
    const button = await screen.findByRole('button', { name: '→ На перевірці' });

    // Хтось інший уже змінив проєкт: версія на сервері пішла вперед.
    const row = gw.state.projects.find((p) => p.id === 'p-101')!;
    row.status = 'needs_client_info';
    row.version += 1;

    await userEvent.click(button);
    expect(await screen.findByText(/Статус уже змінився: тепер «Потрібна інформація від клієнта»/)).toBeInTheDocument();
    expect(calls(fetchSpy).filter((c) => c.startsWith('POST'))).toHaveLength(1);
  });
});
