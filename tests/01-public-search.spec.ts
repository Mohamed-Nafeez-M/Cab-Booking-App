import { test, expect } from '@playwright/test';

test.describe('Public Search & Listing Flow', () => {
  test('should search rides from homepage and filter listings', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');

    // 2. Perform search from homepage for seeded route
    await page.getByTestId('input-search-source').fill('Chennai');
    await page.getByTestId('input-search-destination').fill('Pondicherry');
    await page.getByTestId('button-search').click();

    // 3. Verify URL navigation to /search with params
    await expect(page).toHaveURL(/\/search\?source=Chennai&destination=Pondicherry/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Find your way there.');

    // 4. Verify listings grid is displayed for Chennai -> Pondicherry
    const listingCards = page.locator('[data-testid^="card-listing-"]');
    await expect(listingCards.first()).toBeVisible();

    // 5. Test Clear filters button
    await page.getByTestId('button-clear-filters').click();

    // 6. Click on the first listing card to view details
    await listingCards.first().click();

    // 7. Verify navigation to listing detail page
    await expect(page).toHaveURL(/\/listings\//);
    await expect(page.getByTestId('button-request-quote')).toBeVisible();
  });
});
