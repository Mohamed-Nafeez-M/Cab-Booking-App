import { test, expect } from '@playwright/test';

test.describe('Customer Workspace & Request Flow', () => {
  test('should submit quote request from listing page and view request desk', async ({ page }) => {
    // 1. Log in as customer
    await page.goto('/login');
    await page.getByTestId('input-email').fill('meera@cabmarket.local');
    await page.getByTestId('input-password').fill('CabMVP123!');
    await page.getByTestId('button-auth-submit').click();
    await expect(page).toHaveURL(/\/customer\/dashboard/);

    // 2. Go to search page and pick a listing
    await page.goto('/search');
    const listingCard = page.locator('[data-testid^="card-listing-"]').first();
    await expect(listingCard).toBeVisible();
    await listingCard.click();

    // 3. Open quote request form
    await page.getByTestId('button-request-quote').click();

    // 4. Fill quote details
    await page.getByTestId('input-travel-date').fill('2026-10-15');
    await page.getByTestId('input-passengers').fill('3');
    await page.getByTestId('input-requirements').fill('Need luggage rack and child seat');
    await page.getByTestId('button-submit-lead').click();

    // 5. Verify redirect to customer requests
    await expect(page).toHaveURL(/\/customer\/leads/);
  });

  test('should update customer profile preferences', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('input-email').fill('rohan@cabmarket.local');
    await page.getByTestId('input-password').fill('CabMVP123!');
    await page.getByTestId('button-auth-submit').click();

    await page.goto('/customer/profile');
    await page.getByTestId('input-profile-city').fill('Mumbai');
    await page.getByTestId('input-profile-preferences').fill('Prefers AC SUV for outstation trips');
    await page.getByTestId('button-save-profile').click();

    await expect(page.getByText('Profile saved.')).toBeVisible();
  });
});
