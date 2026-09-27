// SLA рахується на клієнті від відомого дедлайну — сервер для цього не потрібен.
//
// Пороги з ТЗ (п. 4.1): жовтий — «залишилось МЕНШЕ трьох годин», червоний — прострочено.
// Правка рев'ю до v3 (R1): у документі v3 інваріант Б-9 вимагав `warn` рівно
// на 3:00:00. Це суперечить ТЗ: три години — не «менше трьох». Реалізовано за ТЗ.

export type SlaLevel = 'ok' | 'warn' | 'overdue';

export const WARN_THRESHOLD_MS = 3 * 60 * 60 * 1000;

export function slaLevel(deadlineAt: string, now: number): SlaLevel {
  const left = Date.parse(deadlineAt) - now;
  if (left <= 0) return 'overdue';
  if (left < WARN_THRESHOLD_MS) return 'warn';
  return 'ok';
}

export function formatLeft(deadlineAt: string, now: number): string {
  const left = Date.parse(deadlineAt) - now;
  const sign = left < 0 ? '−' : '';
  const abs = Math.abs(left);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  // Менше години — лише хвилини: не «−0 год 59 хв», а «−59 хв» (знайдено на скриншоті).
  return h === 0 ? `${sign}${m} хв` : `${sign}${h} год ${String(m).padStart(2, '0')} хв`;
}
