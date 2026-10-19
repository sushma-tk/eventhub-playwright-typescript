import { expect, Page } from '@playwright/test';

// ---------------------- Price Format Function --------------------
// "1800" -> "$1,800" (same format the UI shows)
export function formatPrice(price: string | number): string {
  return '$' + Number(price).toLocaleString('en-US');
}

// ---------------------- Login Function --------------------
export async function login(page: Page) {
  // Credentials from .env
  const EMAIL = process.env.EVENTHUB_EMAIL;
  const PASSWORD = process.env.EVENTHUB_PASSWORD;

  if (!EMAIL || !PASSWORD) {
    throw new Error('Missing EVENTHUB_EMAIL or EVENTHUB_PASSWORD in .env');
  }

  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Browse Events →')).toBeVisible();
}