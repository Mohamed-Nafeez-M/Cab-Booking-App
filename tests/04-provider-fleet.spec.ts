import { test, expect } from '@playwright/test';

test.describe('Provider Fleet & Operations Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as provider
    await page.goto('/login');
    await page.getByTestId('input-email').fill('suresh@cabmarket.local');
    await page.getByTestId('input-password').fill('CabMVP123!');
    await page.getByTestId('button-auth-submit').click();
    await expect(page).toHaveURL(/\/provider\/dashboard/);
  });

  test('should create and delete a vehicle in provider fleet', async ({ page }) => {
    await page.goto('/provider/vehicles');

    const testRegNum = `KA ${Math.floor(10 + Math.random() * 89)} XY ${Math.floor(1000 + Math.random() * 8990)}`;

    // Click Add vehicle
    await page.getByTestId('button-add-vehicles').click();

    // Fill vehicle details
    await page.getByTestId('input-vehicle-model').fill('Maruti Dzire');
    await page.getByTestId('input-registration').fill(testRegNum);
    await page.getByTestId('input-seats').fill('4');
    await page.getByTestId('input-vehicle-description').fill('Clean compact sedan');
    await page.getByTestId('button-save-resource').click();

    // Verify created vehicle is listed
    await expect(page.getByText(testRegNum)).toBeVisible();
  });

  test('should create a new driver in provider workspace', async ({ page }) => {
    await page.goto('/provider/drivers');

    const testDriverName = `Ramesh Driver ${Date.now().toString().slice(-4)}`;

    await page.getByTestId('button-add-drivers').click();

    await page.getByTestId('input-driver-name').fill(testDriverName);
    await page.getByTestId('input-driver-phone').fill('9876501234');
    await page.getByTestId('input-license').fill(`DL-${Math.floor(10000000 + Math.random() * 90000000)}`);
    await page.getByTestId('input-driver-aadhar').fill('9999 8888 7777');
    await page.getByTestId('button-save-resource').click();

    await expect(page.getByText(testDriverName)).toBeVisible();
  });

  test('should update provider business profile', async ({ page }) => {
    await page.goto('/provider/profile');

    await page.getByTestId('input-company-name').fill('Suresh Express Cabs');
    await page.getByTestId('input-company-address').fill('MG Road, Bangalore');
    await page.getByTestId('input-company-description').fill('24/7 reliability across South India');
    await page.getByTestId('button-save-profile').click();

    await expect(page.getByText('Profile saved.')).toBeVisible();
  });
});
