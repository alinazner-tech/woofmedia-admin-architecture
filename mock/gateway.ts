/**
 * ЕТАЛОННИЙ МОК API-ШЛЮЗУ.
 *
 * Це не бекенд WoofMedia і не заміна йому. Це виконуваний опис контракту з
 * ARCHITECTURE.md (Додаток А): як шлюз ЗОБОВʼЯЗАНИЙ поводитися, щоб архітектура
 * фронтенду була безпечною. Один обробник Request → Response обслуговує все:
 *   1. локальний демо-стенд (`npm run dev`, `npm run preview`);
 *   2. тести фронтенду на деградацію, конфлікти, вкладки (ФЕ);
 *   3. contract-тести (СТЕНД), які ті самі перевірки запускають проти справжнього
 *      бекенду, коли задано CONTRACT_BASE_URL (tests/contract).
 *
 * Токени тут — рядки `tok_<userId>` без криптографії. Справжній шлюз видає JWT RS256.
 */

import type {
  AllowedTransition, ChecklistItem, Credentials, Note, Project, ProjectStatus,
} from '../src/entities/project/types';
import type { Capability, Me, Role } from '../src/entities/user/types';

// ------------------------------------------------------------------ дані ---

type AnyRole = Role | 'client';

interface User {
  id: string;
  name: string;
  role: AnyRole;
  teamId: string | null;
}

export const USERS: Record<string, User> = {
  'spec-a': { id: 'spec-a', name: 'Олена Коваль', role: 'specialist', teamId: 'team-a' },
  'spec-b': { id: 'spec-b', name: 'Максим Бондар', role: 'specialist', teamId: 'team-b' },
  'lead-a': { id: 'lead-a', name: 'Ірина Шевчук', role: 'teamlead', teamId: 'team-a' },
  admin: { id: 'admin', name: 'Андрій Мельник', role: 'super_admin', teamId: null },
  // Клієнт мобільного застосунку — ходить лише в клієнтське API (А-10, Б-13).
  'client-1': { id: 'client-1', name: 'Смайл Дент', role: 'client', teamId: null },
};

const CAPS: Record<AnyRole, Capability[]> = {
  specialist: ['projects.read'],
  teamlead: ['projects.read', 'projects.reassign', 'projects.accept'],
  super_admin: ['projects.read', 'projects.reassign', 'projects.accept', 'finance.read', 'prompts.read', 'prompts.publish', 'monitoring.read'],
  client: [],
};

// Поле priceUsd — фінансове: для ролей без finance.read шлюз його ВИРІЗАЄ,
// поле відсутнє, а не null (А-6, Б-4).
interface ProjectRow extends Omit<Project, 'allowedTransitions' | 'allowedActions'> {
  priceUsd: number;
  clientId: string;
}

type Service = 'projects' | 'checklists' | 'notes' | 'billing' | 'ai' | 'monitoring' | 'auth';

export interface GatewayState {
  projects: ProjectRow[];
  checklists: Record<string, ChecklistItem[]>;
  notes: Record<string, Note[]>;
  credentials: Record<string, Credentials[]>;
  audit: { userId: string; projectId: string; at: string }[];
  idempotency: Map<string, { status: number; body: string }>;
  down: Set<Service>;
}

const H = 3_600_000;

export function seed(now: number = Date.now()): GatewayState {
  const iso = (ms: number) => new Date(now + ms).toISOString();
  const p = (id: string, title: string, clientName: string, type: string, assigneeId: string | null,
    teamId: string, status: ProjectStatus, deadlineInMs: number, priceUsd: number, clientId = 'client-x'): ProjectRow =>
    ({ id, title, clientName, type, assigneeId, teamId, status, version: 1, deadlineAt: iso(deadlineInMs), priceUsd, clientId });

  const projects = [
    p('p-101', 'Пошукова реклама для стоматології', 'Смайл Дент', 'Google Search Ads', 'spec-a', 'team-a', 'in_progress', 30 * H, 224, 'client-1'),
    p('p-102', 'Таргет для кавʼярні', 'Кава на розі', 'Meta Ads', 'spec-a', 'team-a', 'assigned', 2 * H, 74),
    p('p-103', 'Запуск у TikTok', 'Teen Wear', 'TikTok Ads', 'spec-a', 'team-a', 'on_review', -1 * H, 224),
    p('p-104', 'SEO-аудит сайту', 'Енергум', 'SEO Аудит', null, 'team-a', 'awaiting_assignment', 90 * H, 449),
    p('p-201', 'Реклама автосервісу', 'Мотор Плюс', 'Google Search Ads', 'spec-b', 'team-b', 'in_progress', 20 * H, 224),
    p('p-202', 'Email-розсилка', 'Книгарня Є', 'Email Marketing', 'spec-b', 'team-b', 'needs_client_info', 50 * H, 74),
  ];
  const checklist = (done: number): ChecklistItem[] =>
    ['Доступ до кабінету', 'Аналіз ключових слів', 'Створення кампанії', 'Аудиторії', 'Оголошення RSA',
      'Бюджет і ставки', 'Тест перед запуском', 'Запуск і підтвердження']
      .map((label, i) => ({ id: `c${i + 1}`, label, done: i < done }));

  return {
    projects,
    checklists: Object.fromEntries(projects.map((x, i) => [x.id, checklist((i * 3) % 9)])),
    notes: Object.fromEntries(projects.map((x) => [x.id, [
      { id: `${x.id}-n1`, visibility: 'internal', text: 'Клієнт просив не чіпати брендові запити.', author: 'Ірина Шевчук' },
      { id: `${x.id}-n2`, visibility: 'client', text: 'Кампанію запущено, перші дані — за 48 годин.', author: 'Олена Коваль' },
    ] satisfies Note[]])),
    credentials: Object.fromEntries(projects.map((x) => [x.id, [
      { platform: 'Google Ads', login: `ads+${x.id}@woof.media`, secret: `SECRET-${x.id}-GA` },
      { platform: 'Meta Business', login: `meta+${x.id}@woof.media`, secret: `SECRET-${x.id}-META` },
    ]])),
    audit: [],
    idempotency: new Map(),
    down: new Set(),
  };
}

// ------------------------------------------------------- статусна машина ---
// Еталонна таблиця переходів — припущення П-3 (реальна таблиця — у бекенду).

type Actor = 'assignee' | 'lead' | 'client';
const MATRIX: { from: ProjectStatus; to: ProjectStatus; by: Actor; requiresComment?: boolean }[] = [
  { from: 'assigned', to: 'in_progress', by: 'assignee' },
  { from: 'in_progress', to: 'needs_client_info', by: 'assignee', requiresComment: true },
  { from: 'in_progress', to: 'on_review', by: 'assignee' },
  { from: 'needs_client_info', to: 'in_progress', by: 'client' }, // ініціює клієнт із застосунку
  { from: 'on_review', to: 'done', by: 'lead' },
  { from: 'on_review', to: 'in_progress', by: 'lead', requiresComment: true },
  { from: 'done', to: 'published', by: 'lead' },
];

function actorsFor(u: User, p: ProjectRow): Set<Actor> {
  const a = new Set<Actor>();
  if (u.role === 'client') {
    if (p.clientId === u.id) a.add('client');
    return a;
  }
  if (p.assigneeId === u.id) a.add('assignee');
  if (u.role === 'super_admin' || (u.role === 'teamlead' && u.teamId === p.teamId)) a.add('lead');
  return a;
}

function allowedTransitions(u: User, p: ProjectRow): AllowedTransition[] {
  const actors = actorsFor(u, p);
  return MATRIX.filter((m) => m.from === p.status && actors.has(m.by))
    .map((m) => ({ to: m.to, requiresComment: !!m.requiresComment }));
}

// ----------------------------------------------------------------- обсяг ---
// А-4: обсяг визначається ЛИШЕ з токена. Параметри запиту можуть тільки звужувати.

function inScope(u: User, p: ProjectRow): boolean {
  if (u.role === 'super_admin') return true;
  if (u.role === 'teamlead') return p.teamId === u.teamId;
  if (u.role === 'specialist') return p.assigneeId === u.id;
  return false; // клієнт не ходить у робоче API панелі
}

function toDto(u: User, p: ProjectRow): Project & { priceUsd?: number } {
  const { priceUsd, clientId: _clientId, ...rest } = p;
  const dto: Project & { priceUsd?: number } = {
    ...rest,
    allowedTransitions: allowedTransitions(u, p),
    allowedActions: CAPS[u.role].includes('projects.reassign') ? ['reassign'] : [],
  };
  if (CAPS[u.role].includes('finance.read')) dto.priceUsd = priceUsd;
  return dto;
}

// ------------------------------------------------------------- відповіді ---

let reqSeq = 0;
const now = () => new Date().toUTCString();

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', Date: now(), ...extra },
  });
}

function problem(status: number, code: string, title: string, more: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({ type: `https://woof.media/problems/${code}`, title, status, code, requestId: `r-${++reqSeq}`, ...more }),
    { status, headers: { 'Content-Type': 'application/problem+json', Date: now() } },
  );
}

function etag(body: unknown): string {
  const s = JSON.stringify(body);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `"${(h >>> 0).toString(16)}"`;
}

function withEtag(req: Request, body: unknown): Response {
  const tag = etag(body);
  if (req.headers.get('If-None-Match') === tag) {
    return new Response(null, { status: 304, headers: { ETag: tag, Date: now() } });
  }
  return json(body, 200, { ETag: tag, 'Cache-Control': 'no-cache' });
}

function userFrom(req: Request): User | null {
  const m = /^Bearer tok_(.+)$/.exec(req.headers.get('Authorization') ?? '');
  return m ? USERS[m[1]] ?? null : null;
}

function refreshCookie(req: Request): string | null {
  const m = /(?:^|;\s*)woof_refresh=([^;]+)/.exec(req.headers.get('Cookie') ?? '');
  return m ? decodeURIComponent(m[1]) : null;
}

async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

// ---------------------------------------------------------------- роутер ---

export function createGateway(initial: GatewayState = seed()) {
  let state = initial;

  const down = (s: Service): Response | null =>
    state.down.has(s) ? problem(503, 'service_unavailable', 'Сервіс тимчасово недоступний', { service: s }) : null;

  async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, '');
    const method = req.method;

    // ---- службове: лише в моку, для демо й тестів
    if (path === '/__dev/down' && method === 'POST') {
      const b = await body<{ service: Service; down: boolean }>(req);
      if (b.down) state.down.add(b.service); else state.down.delete(b.service);
      return json({ down: [...state.down] });
    }
    if (path === '/__dev/reset' && method === 'POST') {
      state = seed();
      return json({ ok: true });
    }
    if (path === '/__dev/audit' && method === 'GET') return json(state.audit);

    // ---- автентифікація (А-1)
    if (path.startsWith('/auth/')) {
      const off = down('auth');
      if (off) return off;
      if (path === '/auth/login' && method === 'POST') {
        const { userId } = await body<{ userId: string }>(req);
        const u = USERS[userId];
        if (!u || u.role === 'client') return problem(401, 'bad_credentials', 'Невірні облікові дані');
        return json({ accessToken: `tok_${userId}` }, 200, {
          'Set-Cookie': `woof_refresh=${encodeURIComponent(userId)}; HttpOnly; Path=/api/auth; SameSite=Strict`,
        });
      }
      if (path === '/auth/refresh' && method === 'POST') {
        const id = refreshCookie(req);
        if (!id || !USERS[id]) return problem(401, 'no_session', 'Сесія відсутня');
        return json({ accessToken: `tok_${id}` });
      }
      if (path === '/auth/logout' && method === 'POST') {
        return new Response(null, {
          status: 204,
          headers: { Date: now(), 'Set-Cookie': 'woof_refresh=; HttpOnly; Path=/api/auth; Max-Age=0' },
        });
      }
    }

    const user = userFrom(req);
    if (!user) return problem(401, 'unauthenticated', 'Потрібен вхід');

    // ---- клієнтське API мобільного застосунку: ніколи не віддає internal (А-10, Б-13)
    const cm = /^\/client\/projects\/([^/]+)\/notes$/.exec(path);
    if (cm && method === 'GET') {
      const row = state.projects.find((p) => p.id === cm[1]);
      if (user.role !== 'client' || !row || row.clientId !== user.id) return problem(404, 'not_found', 'Не знайдено');
      return json((state.notes[row.id] ?? []).filter((n) => n.visibility === 'client'));
    }
    if (user.role === 'client') return problem(403, 'forbidden', 'Недостатньо прав');

    // ---- /me (А-3)
    if (path === '/me' && method === 'GET') {
      const me: Me = { id: user.id, name: user.name, role: user.role as Role, teamId: user.teamId, capabilities: CAPS[user.role] };
      return json(me);
    }

    // ---- проєкти (А-4 … А-10)
    if (path === '/projects' && method === 'GET') {
      const off = down('projects');
      if (off) return off;
      const assignee = url.searchParams.get('assigneeId');
      const team = url.searchParams.get('teamId');
      const list = state.projects
        .filter((p) => inScope(user, p)) // обсяг — з токена
        .filter((p) => (assignee ? p.assigneeId === assignee : true)) // параметри лише звужують
        .filter((p) => (team ? p.teamId === team : true))
        .map((p) => toDto(user, p));
      return withEtag(req, list);
    }

    const m = /^\/projects\/([^/]+)(?:\/(checklist|notes|credentials|transitions|assignee))?$/.exec(path);
    if (m) {
      const [, id, sub] = m;
      const service: Service = sub === 'checklist' ? 'checklists' : sub === 'notes' ? 'notes' : 'projects';
      const off = down(service);
      if (off) return off;

      const row = state.projects.find((p) => p.id === id);
      // А-4: поза обсягом — 404 для самого ресурсу і ВСІХ вкладених.
      if (!row || !inScope(user, row)) return problem(404, 'not_found', 'Проєкт не знайдено', { service });

      if (!sub && method === 'GET') return withEtag(req, toDto(user, row));
      if (sub === 'checklist' && method === 'GET') return json(state.checklists[id] ?? []);
      if (sub === 'notes' && method === 'GET') return json(state.notes[id] ?? []);

      if (sub === 'notes' && method === 'POST') {
        const b = await body<{ text?: string; visibility?: string }>(req);
        // А-10: visibility обовʼязкове, без значення за замовчуванням.
        if (b.visibility !== 'internal' && b.visibility !== 'client') {
          return problem(422, 'visibility_required', 'Вкажіть, кому видно нотатку', { service });
        }
        const note: Note = { id: `${id}-n${Date.now()}`, visibility: b.visibility, text: b.text ?? '', author: user.name };
        (state.notes[id] ??= []).push(note);
        return json(note, 201);
      }

      if (sub === 'credentials' && method === 'GET') {
        // А-7: окремий ендпоїнт, кожне звернення — в журнал аудиту, no-store.
        state.audit.push({ userId: user.id, projectId: id, at: new Date().toISOString() });
        return json(state.credentials[id] ?? [], 200, { 'Cache-Control': 'no-store' });
      }

      if (sub === 'transitions' && method === 'POST') {
        const key = req.headers.get('Idempotency-Key');
        if (key && state.idempotency.has(`${user.id}:${key}`)) {
          const prev = state.idempotency.get(`${user.id}:${key}`)!;
          return new Response(prev.body, { status: prev.status, headers: { 'Content-Type': 'application/json', Date: now() } });
        }
        const b = await body<{ to: ProjectStatus; expectedVersion: number; comment?: string }>(req);
        if (b.expectedVersion !== row.version) {
          return problem(409, 'version_conflict', 'Проєкт змінено іншим користувачем', { service, currentStatus: row.status });
        }
        const allowedNow = allowedTransitions(user, row);
        const t = allowedNow.find((x) => x.to === b.to);
        if (!t) {
          return problem(422, 'transition_not_allowed', 'Цей перехід вам недоступний', { service, allowedTransitions: allowedNow });
        }
        if (t.requiresComment && !b.comment?.trim()) {
          return problem(422, 'comment_required', 'Для цього переходу потрібен коментар', { service });
        }
        row.status = b.to;
        row.version += 1;
        const res = JSON.stringify(toDto(user, row));
        if (key) state.idempotency.set(`${user.id}:${key}`, { status: 200, body: res });
        return new Response(res, { status: 200, headers: { 'Content-Type': 'application/json', Date: now() } });
      }

      if (sub === 'assignee' && method === 'POST') {
        const { userId } = await body<{ userId: string }>(req);
        const target = USERS[userId];
        const canReassign = CAPS[user.role].includes('projects.reassign');
        // А-9: і проєкт, і новий виконавець мають бути в обсязі тімліда.
        if (!canReassign || !target || target.role === 'client' ||
            (user.role === 'teamlead' && target.teamId !== user.teamId)) {
          return problem(403, 'reassign_forbidden', 'Переназначення поза вашою командою заборонене', { service });
        }
        row.assigneeId = userId;
        row.version += 1;
        return json(toDto(user, row));
      }
    }

    // ---- модулі супер-адміна (А-6, А-11, А-16)
    const guarded = (cap: Capability, service: Service, make: () => unknown): Response => {
      const off = down(service);
      if (off) return off;
      if (!CAPS[user.role].includes(cap)) return problem(403, 'forbidden', 'Недостатньо прав', { service });
      return json(make());
    };

    if (path === '/finance/summary' && method === 'GET') {
      return guarded('finance.read', 'billing', () => ({ mrrUsd: 53_240, activeSubscriptions: { basic: 60, pro: 145, scale: 37 } }));
    }
    if (path === '/prompts' && method === 'GET') {
      return guarded('prompts.read', 'ai', () => [
        { id: 'pr-analysis', name: 'Аналіз бізнесу при онбордингу', publishedVersion: 7 },
        { id: 'pr-keywords', name: 'Генерація ключових слів', publishedVersion: 12 },
        { id: 'pr-rsa', name: 'RSA-оголошення українською', publishedVersion: 9 },
        { id: 'pr-weekly', name: 'Weekly insights', publishedVersion: 4 },
      ]);
    }
    if (/^\/prompts\/[^/]+\/(publish|rollback)$/.test(path) && method === 'POST') {
      return guarded('prompts.publish', 'ai', () => ({ ok: true }));
    }
    if (path === '/monitoring/services' && method === 'GET') {
      return guarded('monitoring.read', 'monitoring', () =>
        (['auth', 'user', 'project', 'task', 'payment', 'reporting', 'notification', 'ai'] as const).map((service, i) => ({
          service,
          status: (service === 'project' && state.down.has('projects')) || (service === 'ai' && state.down.has('ai')) ? 'down' : 'up',
          uptime24h: 99.9 - i * 0.03,
          errorRate5m: i === 5 ? 0.021 : 0.002,
          p95ms: 80 + i * 17,
          sampledAt: new Date().toISOString(),
        })),
      );
    }

    return problem(404, 'no_route', 'Маршрут не знайдено');
  }

  return { handle, get state() { return state; } };
}
