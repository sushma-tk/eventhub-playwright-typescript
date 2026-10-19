import { test, expect } from '@playwright/test';

// credentials
const EMAIL = process.env.EVENTHUB_EMAIL;
const PASSWORD = process.env.EVENTHUB_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error('Missing EVENTHUB_EMAIL or EVENTHUB_PASSWORD in .env');
}

test("Filter events, open event details, and compare cards", async ({page,}) => {
  // Open login page
  await page.goto("/login");

  // Sign in
  await page.getByLabel('Email', { exact: true }).fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);

  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("link", { name: "Browse Events →" }),).toBeVisible();

  // Open Browse Events
  await page.getByRole("link", { name: "Browse Events →" }).click();

  // Verify Upcoming Events heading
  await expect(page.getByRole("heading", { name: "Upcoming Events" }),).toBeVisible();

  // --- Apply filters
  // Search for World
  await page.getByRole('textbox', { name: 'Search events, venues…' }).fill("World");

  // // Select Conference category and Hyderabad city
  const categoryDropdown = page.getByRole('combobox').filter({ hasText: 'All Categories' });
  const cityDropdown = page.getByRole('combobox').filter({ hasText: 'All Cities' });

  // Confirm each locator matches exactly one dropdown.
  await expect(categoryDropdown).toHaveCount(1);
  await expect(cityDropdown).toHaveCount(1);

  await categoryDropdown.selectOption('Conference');
  await cityDropdown.selectOption('Hyderabad');

  // Confirm the selections actually took effect.
  await expect(categoryDropdown).toHaveValue('Conference');
  await expect(cityDropdown).toHaveValue('Hyderabad');

  // Locate event cards
  const eventCards = page.getByTestId('event-card');

  // Confirm at least one card is visible
  await expect(eventCards.first()).toBeVisible();

  // Find World Tech Summit card
  const targetCard = eventCards.filter({ hasText: "World Tech Summit" });

  await expect(targetCard).toHaveCount(1);

  // Capture details from the card
  const title = ((await targetCard.locator("h3").textContent()) ?? "").trim();
  const price = ((await targetCard.getByText(/\$/).first().textContent()) ?? "").trim();
  const seatsText = (await targetCard.getByText(/seat/i).first().textContent()) ?? "";
  const seats = Number(seatsText.match(/\d+/)?.[0]);

  // Verify captured details
  expect(title).toBe("World Tech Summit");
  expect(price).toContain("$");
  expect(Number.isNaN(seats)).toBe(false);
  expect(seats).toBeGreaterThan(0);

  // Open Book Now from the matching card only
  await targetCard.getByRole("link", { name: /book now/i }).click();

  // Verify event details page
  await expect(page).toHaveURL(/\/events\//);
  await expect(page.getByRole("heading", { name: title, exact: true }),).toBeVisible();
  await expect(page.getByText(price).first()).toBeVisible();

  // Return to Events list
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Upcoming Events" }),).toBeVisible();

  //  Clear filters
  await page.getByRole("button", { name: "Clear filters" }).click();

  // Verify at least 3 event cards
  await expect(eventCards.nth(2)).toBeVisible();

  // Compare first, second, last titles
  const firstTitle = ((await eventCards.first().locator("h3").textContent()) ?? "").trim();
  const secondTitle = ((await eventCards.nth(1).locator("h3").textContent()) ?? "").trim();
  const lastTitle = ((await eventCards.last().locator("h3").textContent()) ?? "").trim();

  expect(firstTitle).not.toBe("");
  expect(secondTitle).not.toBe("");
  expect(lastTitle).not.toBe("");
  expect(firstTitle).not.toBe(lastTitle);
});