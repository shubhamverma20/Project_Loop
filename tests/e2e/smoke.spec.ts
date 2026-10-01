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
  });

  test('Google sign-in button click behavior', async ({ page }) => {
    await page.goto('/login');

    const googleBtnContainer = page.locator('#googleBtnDiv');
    await expect(googleBtnContainer).toBeVisible();

    // Check for either GSI rendered iframe or fallback button
    const googleButton = page.locator('#googleBtnDiv').locator('button, iframe').first();
    await expect(googleButton).toBeVisible();

    // Catch popup or frame interaction if opened upon click
    const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
    await googleButton.click({ force: true }).catch(() => {});
    const popup = await popupPromise;

    if (popup) {
      await popup.waitForLoadState().catch(() => {});
      await expect(popup).toHaveURL(/accounts\.google\.com/);
    }
  });
});