import { test, expect } from '@playwright/test';

test.describe('Homepage Smoke Test', () => {
  test('should load the homepage and display core elements', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Verify brand logo in header
    await expect(page.getByTestId('link-brand').first()).toBeVisible();

    // Verify main hero heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText('The right ride');

    // Verify navigation action links
    await expect(page.getByTestId('link-login')).toBeVisible();

    // Verify search input fields exist
    await expect(page.getByTestId('input-search-source')).toBeVisible();
    await expect(page.getByTestId('input-search-destination')).toBeVisible();
    await expect(page.getByTestId('button-search')).toBeVisible();
  });
});
