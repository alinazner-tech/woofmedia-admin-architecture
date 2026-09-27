import { expect, test } from '@playwright/test';
import { login, resetGateway, USERS } from './helpers';

// Б-10, Б-11 (ФЕ): дві справжні вкладки одного браузера.

test.beforeEach(async ({ page }) => resetGateway(page));

test('Б-11: перехід статусу в одній вкладці видно в іншій за секунду, без перезавантаження', async ({ context, page }) => {
  await login(page, USERS.specialist);
  const other = await context.newPage();
  await other.goto('/queue'); // сесія відновлюється через refresh-cookie
  const row = other.getByRole('row', { name: /Таргет для кавʼярні/ });
  await expect(row.getByText('Призначено')).toBeVisible();

  await page.goto('/projects/p-102');
  await page.getByRole('button', { name: '→ В роботі' }).click();
  await expect(page.locator('.status').first()).toHaveText('В роботі');

  // Опитування раз на 30 с — секундна реакція можлива лише через BroadcastChannel.
  await expect(row.getByText('В роботі')).toBeVisible({ timeout: 2_000 });
});

test('Б-10: вихід в одній вкладці розлогінює іншу', async ({ context, page }) => {
  await login(page, USERS.specialist);
  const other = await context.newPage();
  await other.goto('/queue');
  await expect(other.getByRole('heading', { name: 'Черга проєктів' })).toBeVisible();

  await page.getByRole('button', { name: 'Вийти' }).click();
  await expect(page.getByRole('heading', { name: 'Вхід до панелі' })).toBeVisible();
  await expect(other.getByRole('heading', { name: 'Вхід до панелі' })).toBeVisible({ timeout: 2_000 });
  await expect(other.getByText('Пошукова реклама для стоматології')).toHaveCount(0);
});
