import { test, expect } from '@playwright/test';

test.describe('E2E Smoke Tests', () => {
  test('Login page loads successfully', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder('name@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  });

  test('User can authenticate and access Data Sources / CSV Upload page', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `testuser_${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';

    // Register a new test user to guarantee credentials exist
    await page.goto('/register');
    await page.getByPlaceholder('Jane Doe').fill('Smoke Test User');
    await page.getByPlaceholder('name@company.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Sign up', exact: true }).click();

    // After registration, user is redirected to /dashboard or /sources
    await page.waitForURL(/\/(dashboard|sources)/, { timeout: 10000 });

    // Navigate to sources page where CSV uploader resides
    await page.goto('/sources');

    // Assert that Data Sources header and CSV uploader are visible
    await expect(page.getByRole('heading', { name: 'Data Sources' })).toBeVisible();
    await expect(page.getByText('Ingest customer feedback via Smart CSV Upload', { exact: false })).toBeVisible();
  });

  test('User can upload a CSV file via Smart CSV Importer', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `csvuser_${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';

    await page.goto('/register');
    await page.getByPlaceholder('Jane Doe').fill('CSV Test User');
    await page.getByPlaceholder('name@company.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Sign up', exact: true }).click();

    await page.waitForURL(/\/(dashboard|sources)/, { timeout: 10000 });
    await page.goto('/sources');

    // Upload test feedback CSV
    const csvContent = 'content,channel,customer_label\n"The checkout process was extremely fast and smooth!",Web,user_101\n"App crashed when opening settings",Mobile,user_102';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test_feedback.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Assert CSV import success feedback
    await expect(page.getByText(/Import Complete/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Successfully imported/i)).toBeVisible();
  });
});