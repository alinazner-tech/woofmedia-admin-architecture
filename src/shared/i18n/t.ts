// Власний шар i18n: словник і Intl, без бібліотеки (розділ 9, п. 4).
// Польська додається окремим файлом із тими самими ключами.

const SERVICE: Record<string, string> = {
  projects: 'сервіс проєктів',
  checklists: 'сервіс чек-листів',
  notes: 'сервіс нотаток',
  billing: 'фінансовий сервіс',
  ai: 'AI-сервіс',
  monitoring: 'сервіс моніторингу',
  auth: 'сервіс авторизації',
};

export function serviceLabel(service: string | undefined): string {
  if (!service) return 'сервіс';
  return SERVICE[service] ?? service;
}

const money = new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const formatUsd = (n: number) => money.format(n);

const time = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
export const formatTime = (ms: number) => time.format(ms);
