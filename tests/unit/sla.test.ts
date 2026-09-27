import { describe, expect, it, afterEach } from 'vitest';
import { slaLevel, formatLeft } from '../../src/entities/project/sla';
import { serverClock } from '../../src/shared/lib/serverClock';

// Б-9 (ФЕ): SLA-колір визначено правильно, включно з межами.
// Правка рев'ю R1: рівно 3:00:00 — ще «ok», бо ТЗ каже «менше трьох годин».

const NOW = Date.parse('2026-09-27T12:00:00Z');
const at = (ms: number) => new Date(NOW + ms).toISOString();
const S = 1000;
const H = 3600 * S;

describe('Б-9: рівень SLA', () => {
  it.each([
    ['3:00:01 до дедлайну', 3 * H + S, 'ok'],
    ['рівно 3:00:00 — не «менше трьох годин»', 3 * H, 'ok'],
    ['2:59:59', 3 * H - S, 'warn'],
    ['0:00:01', S, 'warn'],
    ['рівно дедлайн', 0, 'overdue'],
    ['прострочено на годину', -H, 'overdue'],
  ])('%s → %s', (_label, delta, expected) => {
    expect(slaLevel(at(delta), NOW)).toBe(expected);
  });

  it('форматує залишок і прострочення', () => {
    expect(formatLeft(at(2 * H + 5 * 60 * S), NOW)).toBe('2 год 05 хв');
    expect(formatLeft(at(-(H + 30 * 60 * S)), NOW)).toBe('−1 год 30 хв');
    expect(formatLeft(at(-59 * 60 * S), NOW)).toBe('−59 хв');
    expect(formatLeft(at(45 * 60 * S), NOW)).toBe('45 хв');
  });
});

describe('Б-9: поправка годинника клієнта', () => {
  afterEach(() => serverClock.reset());

  it('годинник співробітника поспішає на 10 хв — рівень рахується від серверного часу', () => {
    const localNow = NOW + 10 * 60 * S; // локальний годинник поспішає
    serverClock.observe(new Date(NOW).toUTCString(), localNow); // заголовок Date зі шлюзу
    const deadline = at(3 * H + 5 * 60 * S); // за сервером: 3:05 — «ok»

    // Без поправки було б 2:55 — «warn». З поправкою — «ok».
    expect(slaLevel(deadline, localNow)).toBe('warn');
    expect(slaLevel(deadline, serverClock.now(localNow))).toBe('ok');
  });
});
