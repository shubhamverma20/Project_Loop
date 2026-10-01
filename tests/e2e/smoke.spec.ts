import { test, expect } from '@playwright/test';

test.describe('Project LOOP - E2E Smoke Tests', () => {
  test('Login page loads successfully', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('Login page has email, password inputs, and submit button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('name@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('Login page renders Google auth option', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#googleBtnDiv')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });
});