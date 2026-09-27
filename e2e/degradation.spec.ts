import { expect, test } from '@playwright/test';
import { collectPageErrors, login, resetGateway, setDown, USERS } from './helpers';

// Б-7 (ФЕ): падіння одного сервісу не кладе сторінку.
// Б-7м (ФЕ): межа інваріанту — лежить сам шлюз: не білий екран.

test.beforeEach(async ({ page }) => resetGateway(page));

const CARD = '/projects/p-101';

test.describe('Б-7: сервіс за сервісом', () => {
  test('лежить сервіс чек-листів — у картці гасне лише чек-лист', async ({ page }) => {
    const errors = collectPageErrors(page);
    await login(page, USERS.specialist);
    await setDown(page, 'checklists', true);
    await page.goto(CARD);

    await expect(page.getByLabel('Чек-лист').getByText('Не відповідає сервіс чек-листів')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Пошукова реклама для стоматології' })).toBeVisible();
    await expect(page.getByLabel('Нотатки').getByText(/брендові запити/)).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('лежить сервіс нотаток — у картці гасне лише блок нотаток', async ({ page }) => {
    const errors = collectPageErrors(page);
    await login(page, USERS.specialist);
    await setDown(page, 'notes', true);
    await page.goto(CARD);

    await expect(page.getByLabel('Нотатки').getByText('Не відповідає сервіс нотаток')).toBeVisible();
    await expect(page.getByLabel('Чек-лист').getByText('Доступ до кабінету')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('лежить сервіс проєктів — черга показує заглушку, меню і вихід працюють', async ({ page }) => {
    const errors = collectPageErrors(page);
    await login(page, USERS.admin);
    await setDown(page, 'projects', true);
    await page.goto('/queue');

    await expect(page.getByText('Не відповідає сервіс проєктів')).toBeVisible();
    await page.getByRole('navigation').getByRole('link', { name: 'Промпти' }).click();
    await expect(page.getByText('RSA-оголошення українською')).toBeVisible();
    await page.getByRole('navigation').getByRole('link', { name: 'Моніторинг' }).click();
    await expect(page.getByRole('row', { name: /project/ }).getByText('лежить')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('сервіс проєктів упав, коли дані вже були — показано останні дані без кнопок дій', async ({ page }) => {
    await login(page, USERS.specialist);
    await page.goto(CARD);
    await expect(page.getByRole('button', { name: '→ На перевірці' })).toBeVisible();

    await setDown(page, 'projects', true);
    // Повернення у вкладку — refetch при фокусі.
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

    await expect(page.getByText(/Показано дані\s+станом на/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Пошукова реклама для стоматології' })).toBeVisible();
    await expect(page.getByRole('button', { name: '→ На перевірці' })).toHaveCount(0);
  });
});

test('Б-7м: лежить шлюз — оболонка з CDN показує зрозумілий екран', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort('connectionrefused'));
  await page.goto('/queue');
  await expect(page.getByRole('heading', { name: 'Панель тимчасово недоступна' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Спробувати зараз' })).toBeVisible();
});
