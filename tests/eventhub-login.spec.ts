import { test, expect } from '@playwright/test';

/* 
first test that opens the EventHub login page (/login).
Confirm the page shows the Sign in to EventHub heading, the email field with placeholder you@email.com, 
and the Sign In button.
*/
test('EventHub login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Sign in to EventHub' })).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});


/*
Login-page smoke check that asserts the Password field is visible, the URL contains /login, 
and the Sign in to EventHub heading is still visible.
*/
test('EventHub login page smoke check', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in to EventHub' })).toBeVisible();
});