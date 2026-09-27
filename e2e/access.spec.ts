import { expect, test } from '@playwright/test';
import { login, resetGateway, USERS } from './helpers';

// Б-3б (ФЕ): спеціаліст за весь сеанс не завантажує жодного адмінського chunk,
// навіть при прямому переході на адмінські адреси. Бачить 404 оболонки.

test.beforeEach(async ({ page }) => resetGateway(page));

test('Б-3б: спеціаліст — жодного запиту на chunk фінансів, моніторингу, промптів', async ({ page }) => {
  const adminChunks: string[] = [];
  page.on('request', (r) => {
    if (/\/assets\/(finance|monitoring|prompts)-[^/]+\.js$/.test(r.url())) adminChunks.push(r.url());
  });

  await login(page, USERS.specialist);
  await expect(page.getByRole('navigation').getByRole('link')).toHaveText(['Черга']);

  // Обхід усіх своїх маршрутів.
  await page.getByRole('link', { name: 'Пошукова реклама для стоматології' }).click();
  await expect(page.getByRole('heading', { name: 'Пошукова реклама для стоматології' })).toBeVisible();

  // Прямий перехід на адмінські адреси.
  for (const path of ['/finance', '/monitoring', '/prompts']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeVisible();
  }

  expect(adminChunks).toEqual([]);
});

test('контроль: супер-адмін отримує chunk фінансів лише коли відкриває розділ', async ({ page }) => {
  const financeChunk: string[] = [];
  page.on('request', (r) => {
    if (/\/assets\/finance-[^/]+\.js$/.test(r.url())) financeChunk.push(r.url());
  });

  await login(page, USERS.admin);
  await expect(page.getByRole('heading', { name: 'Черга проєктів' })).toBeVisible();
  expect(financeChunk).toHaveLength(0);

  await page.getByRole('navigation').getByRole('link', { name: 'Фінанси' }).click();
  await expect(page.getByText('MRR', { exact: true })).toBeVisible();
  expect(financeChunk).toHaveLength(1);
});
