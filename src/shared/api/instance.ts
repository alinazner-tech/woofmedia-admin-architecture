import { createApiClient } from './client';

// Один екземпляр клієнта на застосунок. Шлюз — на тому ж site, що й панель
// (admin.* і api.*), щоб refresh-cookie працювала (А-1).

let onForbidden: (() => void) | null = null;

/** Застосунок реєструє реакцію на 403: перезапит /me і перебудова меню (Б-16). */
export function setForbiddenHandler(fn: (() => void) | null): void {
  onForbidden = fn;
}

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE ?? '/api',
  onForbidden: () => onForbidden?.(),
});
