import { test, expect } from '@playwright/test';

test.describe('Provider Quotation & Lead Response Flow', () => {
  test('should allow provider to respond to open lead with quote and customer to accept it', async ({ page }) => {
    // Step 1: Customer creates a lead
    await page.goto('/login');
    await page.getByTestId('input-email').fill('arjun@cabmarket.local');
    await page.getByTestId('input-password').fill('CabMVP123!');
    await page.getByTestId('button-auth-submit').click();
    await expect(page).toHaveURL(/\/customer\/dashboard/);

    await page.goto('/search');
    const listingCard = page.locator('[data-testid^="card-listing-"]').first();
    await expect(listingCard).toBeVisible();
    await listingCard.click();

    await page.getByTestId('button-request-quote').click();
    await page.getByTestId('input-travel-date').fill('2026-11-20');
    await page.getByTestId('input-passengers').fill('2');
    await page.getByTestId('input-requirements').fill('Airport pick up at 6 AM');
    await page.getByTestId('button-submit-lead').click();
    await expect(page).toHaveURL(/\/customer\/leads/);

    // Step 2: Log out customer and log in as provider
    await page.getByTestId('button-logout').click();

    await page.goto('/login');
    await page.getByTestId('input-email').fill('coastal@cabmarket.local');
    await page.getByTestId('input-password').fill('CabMVP123!');
    await page.getByTestId('button-auth-submit').click();
    await expect(page).toHaveURL(/\/provider\/dashboard/);

    // Navigate to open leads desk
    await page.goto('/provider/leads');
    const providerLeadRow = page.locator('[data-testid^="row-lead-"]').first();
    await expect(providerLeadRow).toBeVisible();
    await providerLeadRow.click();

    // Send quote
    await page.getByTestId('input-quotation-price').fill('3500');
    await page.getByTestId('input-quotation-message').fill('All inclusive fare');
    await page.getByTestId('button-submit-quotation').click();
    await expect(page.getByText('Quote sent to the customer.')).toBeVisible();

    // Step 3: Log back in as customer to accept quote
    await page.getByTestId('button-logout').click();

    await page.goto('/login');
    await page.getByTestId('input-email').fill('arjun@cabmarket.local');
    await page.getByTestId('input-password').fill('CabMVP123!');
    await page.getByTestId('button-auth-submit').click();
    await expect(page).toHaveURL(/\/customer\/dashboard/);

    // Navigate to customer leads desk and open the lead
    await page.goto('/customer/leads');
    const customerLeadRow = page.locator('[data-testid^="row-lead-"]').first();
    await expect(customerLeadRow).toBeVisible();
    await customerLeadRow.click();

    // Click Accept quote
    const acceptBtn = page.locator('[data-testid^="button-accept-"]').first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // Verify quote accepted status indicator
    await expect(page.getByText('ACCEPTED').first()).toBeVisible();
  });
});
