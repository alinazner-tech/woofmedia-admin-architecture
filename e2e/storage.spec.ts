import { expect, test } from '@playwright/test';
import { login, resetGateway, USERS } from './helpers';

// Б-12 (ФЕ): доступи до кабінетів не зберігаються на диску браузера.
// Б-15 (ФЕ): застарілий chunk після деплою — не білий екран.

test.beforeEach(async ({ page }) => resetGateway(page));

test('Б-12: після показу доступів і виходу — жодного секрету в сховищах браузера', async ({ page }) => {
  await login(page, USERS.specialist);
  await page.goto('/projects/p-101');
  await page.getByRole('button', { name: 'Показати доступи до кабінетів' }).click();
  await expect(page.getByText('SECRET-p-101-GA')).toBeVisible();
  await page.getByRole('button', { name: 'Сховати' }).click();
  await page.getByRole('button', { name: 'Вийти' }).click();
  await expect(page.getByRole('heading', { name: 'Вхід до панелі' })).toBeVisible();

  const dump = await page.evaluate(async () => {
    const all = (s: Storage) => Object.keys(s).map((k) => `${k}=${s.getItem(k)}`).join('\n');
    const dbs = 'databases' in indexedDB ? await indexedDB.databases() : [];
    return { local: all(localStorage), session: all(sessionStorage), dbs: dbs.map((d) => d.name), cookie: document.cookie };
  });

  expect(dump.local).not.toContain('SECRET');
  expect(dump.session).not.toContain('SECRET');
  expect(dump.dbs).toEqual([]);
  // Токени JS не бачить: access — лише в памʼяті, refresh — HttpOnly-cookie.
  expect(dump.local + dump.session + dump.cookie).not.toMatch(/tok_|woof_refresh/);
});

test('Б-15: chunk зник із CDN після деплою — екран «вийшла нова версія», а не білий', async ({ page }) => {
  await login(page, USERS.admin);
  await page.route(/\/assets\/finance-[^/]+\.js$/, (route) => route.fulfill({ status: 404, body: 'Not Found' }));

  await page.getByRole('navigation').getByRole('link', { name: 'Фінанси' }).click();
  await expect(page.getByRole('heading', { name: 'Вийшла нова версія панелі' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Оновити' })).toBeVisible();
  // Меню живе: інші розділи працюють.
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Черга' })).toBeVisible();
});
