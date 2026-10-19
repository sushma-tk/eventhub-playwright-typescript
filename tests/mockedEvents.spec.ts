import { test, expect } from '@playwright/test';
import { mockEvents, installEventApiMocks } from '../utils/mockEvents';
import { formatPrice, login } from '../utils/helpers';

// ------------------- Test --------------------
test('mock Events catalog, filters, event detail, and ticket totals', async ({page}) => {
  // Login
  await login(page);

  // intercepting API calls before navigating to Events.
  await installEventApiMocks(page);

  // Open Events. The page will now receive mock data.
  await page.getByRole('link', { name: 'Events', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Upcoming Events', exact: true }),).toBeVisible();

  // Confirm only four mocked events are present.
  const cardTitles = page.locator('#event-card').locator('a h3');
  await expect(cardTitles).toHaveCount(4);

  // Confirm a known live event is absent.
  await expect(page.getByText('World Tech Summit', { exact: true }),).not.toBeVisible();

  // Confirm every mock title is displayed each title link goes to the correct mocked event id.
  // Also confirm each card shows the mock price, seats, and Book Now link.
  for (const event of mockEvents) {
  const titleLink = page.getByRole('link', {name: event.title,exact: true,});
  await expect(titleLink).toBeVisible();
  await expect(titleLink).toHaveAttribute('href',new RegExp(`/events/${event.id}$`));

  const card = page.locator('#event-card').filter({ hasText: event.title });
  await expect(card).toContainText(formatPrice(event.price));
  await expect(card).toContainText(`${event.availableSeats} seats available`);
  await expect(card.getByRole('link', { name: 'Book Now' })).toHaveAttribute('href', `/events/${event.id}`);
}

  // Select the Hyderabad Conference mock event.
  const expectedEvent = mockEvents.find((event) =>
      event.category === 'Conference' &&
      event.city === 'Hyderabad',
  );
  if (!expectedEvent) {
    throw new Error('Hyderabad Conference event not found in mockEvents');
  }

  //  Apply the three filters.
  await page.getByPlaceholder(/search events, venues/i).fill('Hyderabad Cloud');
  await page.locator('select').nth(0).selectOption('Conference');
  await page.locator('select').nth(1).selectOption('Hyderabad');

  // Confirm exactly one event title/card remains after filtering.
  await expect(cardTitles).toHaveCount(1);

  // Confirm the one remaining card is the expected mock event.
  const filteredTitleLink = page.getByRole('link', {name: expectedEvent.title,exact: true,});
  await expect(filteredTitleLink).toBeVisible();

  // Store this event for detail-page checks.
  const storedMockRecord = expectedEvent;

  // Navigate to the event detail page.
  const bookNowLink = page.getByRole('link', {name: 'Book Now',exact: true});
  await expect(bookNowLink).toHaveAttribute('href',`/events/${storedMockRecord.id}`,);
  await bookNowLink.click();

  // Confirm the correct detail URL.
  await expect(page).toHaveURL(new RegExp(`/events/${storedMockRecord.id}$`),);

  // Confirm detail page values match the stored mock record.
  await expect(page.getByRole('heading', {name: storedMockRecord.title,exact: true,}),).toBeVisible();
  await expect(page.getByText(formatPrice(storedMockRecord.price),{ exact: true }).last()).toBeVisible();
  await expect(page.getByText(storedMockRecord.venue, { exact: true })).toBeVisible();
  await expect(page.getByText(storedMockRecord.city, { exact: true })).toBeVisible();
  await expect(page.getByText(`${storedMockRecord.availableSeats} / ${storedMockRecord.totalSeats} seats`,{ exact: true })).toBeVisible();

  // Verify ticket quantity starts with 1.
  const ticketCount = page.locator('#ticket-count');
  await expect(ticketCount).toHaveText('1');

  // Confirm one ticket total equals the mock event price.
  const oneTicketTotal = formatPrice(storedMockRecord.price);
  await expect(page.getByText(oneTicketTotal, { exact: true }).last(),).toBeVisible();

  //  Click + and confirm quantity becomes 2.
  await page.getByRole('button', { name: '+' }).click();
  await expect(ticketCount).toHaveText('2');

  // Confirm total equals mock price × 2.
  const twoTicketTotal = formatPrice(Number(storedMockRecord.price) * 2);
  await expect(page.getByText(twoTicketTotal, { exact: true }).last(),).toBeVisible();
});