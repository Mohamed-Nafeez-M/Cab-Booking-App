import { test, expect } from '@playwright/test';

test.describe('Admin Control Room Flow', () => {
  test('should login as admin and view overview metrics and user directory', async ({ page }) => {
    // 1. Log in as Admin
    await page.goto('/login');
    await page.getByTestId('input-email').fill('admin@cabmarket.local');
    await page.getByTestId('input-password').fill('CabMVP123!');
    await page.getByTestId('button-auth-submit').click();

    // 2. Verify redirect to Admin dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Platform overview');

    // 3. Verify metrics cards exist
    await expect(page.getByText('Users', { exact: true })).toBeVisible();
    await expect(page.getByText('Customers', { exact: true })).toBeVisible();
    await expect(page.getByText('Providers', { exact: true })).toBeVisible();

    // 4. Verify registered users directory table
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Registered users');
    await expect(page.getByRole('table')).toBeVisible();
  });
});
