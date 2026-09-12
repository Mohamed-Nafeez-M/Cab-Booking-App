import { test, expect } from '@playwright/test';

test.describe('Customer Registration Flow', () => {
  test('should allow a new customer to register and land on the customer dashboard', async ({ page }) => {
    // Generate unique user details to avoid collision
    const timestamp = Date.now();
    const testName = `Customer User ${timestamp}`;
    const testEmail = `customer_${timestamp}@cabmarket.local`;
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testAadhar = `1234 5678 ${Math.floor(1000 + Math.random() * 9000)}`;
    const testPassword = 'Password123!';

    // Step 1: Navigate to register page
    await page.goto('/register');

    // Verify registration page title/heading
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Create your account');

    // Step 2: Ensure Customer role is selected
    const customerRoleBtn = page.getByTestId('button-role-customer');
    if (await customerRoleBtn.isVisible()) {
      await customerRoleBtn.click();
    }

    // Step 3: Fill out registration form
    await page.getByTestId('input-name').fill(testName);
    await page.getByTestId('input-phone').fill(testPhone);
    await page.getByTestId('input-email').fill(testEmail);
    await page.getByTestId('input-aadhar').fill(testAadhar);
    await page.getByTestId('input-password').fill(testPassword);

    // Step 4: Submit registration form
    await page.getByTestId('button-auth-submit').click();

    // Step 5: Verify successful redirection to Customer Dashboard
    await expect(page).toHaveURL(/\/customer\/dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your rides, at a glance.');
  });
});
