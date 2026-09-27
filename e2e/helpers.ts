import { expect, type Page } from '@playwright/test';

export const USERS = {
  specialist: /Олена — спеціаліст/,
  lead: /Ірина — тімлід/,
  admin: /Андрій — супер-адмін/,
} as const;

export async function resetGateway(page: Page) {
  await page.request.post('/api/__dev/reset');
}

export async function setDown(page: Page, service: string, down: boolean) {
  await page.request.post('/api/__dev/down', { data: { service, down } });
}

export async function login(page: Page, who: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: who }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
}

/** Збирає необроблені винятки сторінки: «падіння сервісу не кладе сторінку» = їх нуль. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}
