import { test, expect } from '@playwright/test';

/**
 * Seed test for the Playwright planner/generator agents.
 * It prepares the starting state they explore from: logged in as
 * standard_user on the inventory page of https://www.saucedemo.com
 * (baseURL comes from the "ui" project in playwright.config.ts).
 */
test.describe('Seed', () => {
  test('logged in as standard_user on the inventory page', async ({ page }) => {
    await page.goto('/');
    // Locator priority: role > label > placeholder > text > test id > CSS/XPath
    await page.getByPlaceholder('Username').fill('standard_user');
    await page.getByPlaceholder('Password').fill('secret_sauce');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(page.getByRole('button', { name: 'Add to cart' })).toHaveCount(6);
  });
});
