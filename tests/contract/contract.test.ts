// @vitest-environment node
/**
 * CONTRACT-ТЕСТИ (інваріанти з позначкою СТЕНД).
 *
 * Безпеку даних забезпечує бекенд. Фронтенд-тест із моками нічого про неї не доводить.
 * Тому один і той самий набір запускається двома способами:
 *
 *   npm test                                 — проти еталонного моку в процесі.
 *                                              Доводить: контракт несуперечливий і
 *                                              виконуваний. НЕ доводить, що бекенд його дотримується.
 *   CONTRACT_BASE_URL=https://api.stage… \   — проти справжнього стенду (А-18).
 *   CONTRACT_TOKENS='{"spec-a":"…",…}' \       Доводить саме те, що треба.
 *   npm run test:contract
 *
 * На стенді тести змінюють фікстурні проєкти — стенд має перезасіватися перед прогоном.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createGateway } from '../../mock/gateway';

const BASE = process.env.CONTRACT_BASE_URL;
const TOKENS: Record<string, string> = BASE ? JSON.parse(process.env.CONTRACT_TOKENS ?? '{}') : {};
const ON_STAND = Boolean(BASE);

// Фікстури стенду (А-18): спеціаліст A і тімлід A в команді A, спеціаліст B — у команді B.
const F = {
  ownProject: 'p-101', // виконавець spec-a, стан «В роботі»
  onReview: 'p-103', // виконавець spec-a, стан «На перевірці»
  foreignProject: 'p-201', // команда B
  clientOfOwn: 'client-1', // клієнт проєкту p-101
};

let gw = createGateway();
beforeEach(() => {
  gw = createGateway();
});

async function call(user: string, method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${ON_STAND ? TOKENS[user] : `tok_${user}`}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const init: RequestInit = { method, headers, body: body === undefined ? undefined : JSON.stringify(body) };
  const res = ON_STAND
    ? await fetch(`${BASE}${path}`, init)
    : await gw.handle(new Request(`http://gateway/api${path}`, init));
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

const FINANCIAL_FIELDS = ['priceUsd', 'tariff', 'budget', 'mrr', 'payout'];

describe('Б-1 (СТЕНД): спеціаліст не отримує чужого проєкту', () => {
  it('список містить лише проєкти, де він виконавець', async () => {
    const { status, json } = await call('spec-a', 'GET', '/projects');
    expect(status).toBe(200);
    expect(json.length).toBeGreaterThan(0);
    expect(json.every((p: { assigneeId: string }) => p.assigneeId === 'spec-a')).toBe(true);
  });

  it('чужий проєкт і всі вкладені ресурси → 404, а не 403', async () => {
    for (const sub of ['', '/checklist', '/notes', '/credentials']) {
      const { status } = await call('spec-a', 'GET', `/projects/${F.foreignProject}${sub}`);
      expect(status, `GET /projects/${F.foreignProject}${sub}`).toBe(404);
    }
  });

  it('параметри фільтра лише звужують: ?assigneeId=spec-b не розширює обсяг', async () => {
    const { json } = await call('spec-a', 'GET', '/projects?assigneeId=spec-b');
    expect(json).toEqual([]);
  });
});

describe('Б-2 (СТЕНД): тімлід не отримує проєктів іншої команди', () => {
  it('список і прямий запит', async () => {
    const list = await call('lead-a', 'GET', '/projects');
    expect(list.json.every((p: { teamId: string }) => p.teamId === 'team-a')).toBe(true);
    expect((await call('lead-a', 'GET', `/projects/${F.foreignProject}`)).status).toBe(404);
  });

  it('переназначення на виконавця з іншої команди → 403', async () => {
    const { status } = await call('lead-a', 'POST', `/projects/${F.ownProject}/assignee`, { userId: 'spec-b' });
    expect(status).toBe(403);
  });
});

describe('Б-4 (СТЕНД): фінансові дані не віддаються не-супер-адміну', () => {
  it.each(['spec-a', 'lead-a'])('%s: /finance/* → 403', async (user) => {
    expect((await call(user, 'GET', '/finance/summary')).status).toBe(403);
  });

  it.each(['spec-a', 'lead-a'])('%s: у відповідях /projects фінансових полів немає — саме немає, а не null', async (user) => {
    const list = await call(user, 'GET', '/projects');
    const one = await call(user, 'GET', `/projects/${F.ownProject}`);
    for (const p of [...list.json, one.json]) {
      for (const field of FINANCIAL_FIELDS) expect(p, `${user}: поле ${field}`).not.toHaveProperty(field);
    }
  });

  it.skipIf(ON_STAND)('контроль: супер-адмін фінансове поле отримує (тест не порожній)', async () => {
    const { json } = await call('admin', 'GET', `/projects/${F.ownProject}`);
    expect(json).toHaveProperty('priceUsd');
  });
});

describe('Б-5 (СТЕНД): недозволений перехід відхиляється, стан не змінюється', () => {
  it.each([
    ['spec-a', F.onReview, 'done', 'спеціаліст приймає власну роботу'],
    ['spec-a', F.ownProject, 'published', 'стрибок через стани'],
    ['lead-a', F.ownProject, 'on_review', 'перехід, який ініціює лише виконавець'],
  ])('%s → %s (%s): 422 transition_not_allowed', async (user, id, to) => {
    const before = await call(user, 'GET', `/projects/${id}`);
    const res = await call(user, 'POST', `/projects/${id}/transitions`, { to, expectedVersion: before.json.version });
    expect(res.status).toBe(422);
    expect(res.json.code).toBe('transition_not_allowed');
    const after = await call(user, 'GET', `/projects/${id}`);
    expect(after.json.status).toBe(before.json.status);
    expect(after.json.version).toBe(before.json.version);
  });

  it('відповідь сервера містить актуальні allowedTransitions', async () => {
    const before = await call('spec-a', 'GET', `/projects/${F.ownProject}`);
    const res = await call('spec-a', 'POST', `/projects/${F.ownProject}/transitions`, { to: 'done', expectedVersion: before.json.version });
    expect(res.json.allowedTransitions).toEqual(before.json.allowedTransitions);
  });
});

describe('Б-6 (СТЕНД): застаріла версія не перезаписує чужу зміну', () => {
  it('два переходи з однаковим expectedVersion → другий 409', async () => {
    const { json: p } = await call('spec-a', 'GET', `/projects/${F.ownProject}`);
    const first = await call('spec-a', 'POST', `/projects/${F.ownProject}/transitions`, { to: 'on_review', expectedVersion: p.version });
    const second = await call('spec-a', 'POST', `/projects/${F.ownProject}/transitions`, { to: 'needs_client_info', expectedVersion: p.version, comment: 'x' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });
});

describe('Б-12с (СТЕНД): доступи до кабінетів аудитуються, чужі недоступні', () => {
  it('свій проєкт → 200 і запис в аудиті; чужий → 404', async () => {
    expect((await call('spec-a', 'GET', `/projects/${F.ownProject}/credentials`)).status).toBe(200);
    expect((await call('spec-a', 'GET', `/projects/${F.foreignProject}/credentials`)).status).toBe(404);
    if (!ON_STAND) {
      // На стенді журнал аудиту перевіряється засобами бекенду, не через панель.
      expect(gw.state.audit).toEqual([expect.objectContaining({ userId: 'spec-a', projectId: F.ownProject })]);
    }
  });
});

describe('Б-13 (СТЕНД): внутрішня нотатка не потрапляє клієнту', () => {
  it('internal-нотатку клієнтське API не повертає', async () => {
    const created = await call('spec-a', 'POST', `/projects/${F.ownProject}/notes`, { text: 'Лише для команди', visibility: 'internal' });
    expect(created.status).toBe(201);
    const forClient = await call(F.clientOfOwn, 'GET', `/client/projects/${F.ownProject}/notes`);
    expect(forClient.status).toBe(200);
    expect(forClient.json.every((n: { visibility: string }) => n.visibility === 'client')).toBe(true);
    expect(forClient.json.map((n: { text: string }) => n.text)).not.toContain('Лише для команди');
  });

  it('нотатка без явного visibility → 422 (значення за замовчуванням немає)', async () => {
    const { status } = await call('spec-a', 'POST', `/projects/${F.ownProject}/notes`, { text: 'Кому це?' });
    expect(status).toBe(422);
  });
});

describe('Б-14 (СТЕНД): публікацію і відкат промптів робить лише супер-адмін', () => {
  it.each(['spec-a', 'lead-a'])('%s: publish і rollback → 403', async (user) => {
    expect((await call(user, 'POST', '/prompts/pr-rsa/publish', { version: 9 })).status).toBe(403);
    expect((await call(user, 'POST', '/prompts/pr-rsa/rollback', { version: 8 })).status).toBe(403);
  });

  it.skipIf(ON_STAND)('контроль: супер-адмін публікує', async () => {
    expect((await call('admin', 'POST', '/prompts/pr-rsa/publish', { version: 9 })).status).toBe(200);
  });
});
