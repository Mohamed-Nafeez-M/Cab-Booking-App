import { test, expect } from '@playwright/test';

test.describe('Authentication & Roles Flow', () => {
  test('should login as seeded customer and redirect to customer dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Sign in to SafarSetu');

    await page.getByTestId('input-email').fill('arjun@cabmarket.local');
    await page.getByTestId('input-password').fill('CabMVP123!');
    await page.getByTestId('button-auth-submit').click();

    await expect(page).toHaveURL(/\/customer\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your rides, at a glance.');
  });

  test('should login as seeded provider and redirect to provider dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('input-email').fill('karthik@cabmarket.local');
    await page.getByTestId('input-password').fill('CabMVP123!');
    await page.getByTestId('button-auth-submit').click();

    await expect(page).toHaveURL(/\/provider\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Keep the wheels turning.');
  });

  test('should show error message for invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('input-email').fill('invalid@cabmarket.local');
    await page.getByTestId('input-password').fill('wrongpassword');
    await page.getByTestId('button-auth-submit').click();

    await expect(page.getByText('That didn’t work. Check your details and try again.')).toBeVisible();
  });
});
