import { test, expect, Page } from '@playwright/test';

// ---------------------- Types ----------------------
// Shape of a booking in the API response (only the fields this test uses)
interface Booking {
  id: number;
  bookingRef: string;
  customerEmail: string;
  quantity: number;
  totalPrice: string;
  event: { title: string };
}

// ---------------------- Test data ----------------------
const targetBookingId = 34056;

const PATCH = {
  bookingRef: 'PATCH-BOOK-34056',
  title: 'Patched Transit Event',
  quantity: 7,
  totalPrice: '7777',
};

const formattedTotal = `$${Number(PATCH.totalPrice).toLocaleString('en-US')}`;

// ---------------------- Login function ----------------------
async function login(page: Page) {
  const EMAIL = process.env.EVENTHUB_EMAIL;
  const PASSWORD = process.env.EVENTHUB_PASSWORD;

  if (!EMAIL || !PASSWORD) {
    throw new Error('Missing EVENTHUB_EMAIL or EVENTHUB_PASSWORD in .env');
  }

  await page.goto("/login");
  await page.getByLabel('Email', { exact: true }).fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Browse Events →')).toBeVisible();
}

// ---------------------- Test ----------------------
test('patch one booking in transit and validate My Bookings and details', async ({page}) => {
  let patchedBooking: Booking | undefined;
  let originalCustomerEmail: string | undefined;
  let otherLiveBooking: Booking | undefined;

  // Login and confirm the My Bookings navigation is available
  await login(page);
  const myBookingsLink = page.locator('#nav-bookings');
  await expect(myBookingsLink).toBeVisible();

  // Intercept the list API before opening My Bookings
  await page.route('**/api/bookings**', async (route) => {
      const url = new URL(route.request().url());

      const BookingsListRequest =
        url.pathname === '/api/bookings' &&
        url.searchParams.get('page') === '1' &&
        url.searchParams.get('limit') === '10';

      if (!BookingsListRequest) {
        await route.continue();
        return;
      }
    // Get the real API response.
    const response = await route.fetch();
    const body = await response.json();
    const bookings: Booking[] = body.data;

    // Find the one booking to patch by its unique original ID.
    const bookingToPatch = bookings.find((booking) => booking.id === targetBookingId);
    expect(bookingToPatch).toBeTruthy();
    if (!bookingToPatch) return;

    // Save an unchanged real field before patching.
    originalCustomerEmail = bookingToPatch.customerEmail;

    // Store another real booking so we can prove live data still exists.
    otherLiveBooking = bookings.find((booking) => booking.id !== targetBookingId);
    expect(otherLiveBooking).toBeTruthy();

    // Patch ONLY the required fields.
    // The id, email, customer name, phone, status, etc. are untouched.
    bookingToPatch.bookingRef = PATCH.bookingRef;
    bookingToPatch.quantity = PATCH.quantity;
    bookingToPatch.totalPrice = PATCH.totalPrice;
    bookingToPatch.event.title = PATCH.title;

    // Save the patched object for use in the detail-route interception.
    patchedBooking = bookingToPatch;

    // Return the original real response with only one modified record.
    await route.fulfill({
      response,
      json: body,
    });
  });

  // Intercept the detail API for the SAME preserved booking ID
  await page.route(`**/api/bookings/${targetBookingId}`, async (route) => {
      const response = await route.fetch();
      const body = await response.json();

      if (!patchedBooking) {
        throw new Error('Detail request happened before the list was patched');
      }

      // Keep detail values aligned with the patched list object.
      body.data.bookingRef = patchedBooking.bookingRef;
      body.data.quantity = patchedBooking.quantity;
      body.data.totalPrice = patchedBooking.totalPrice;
      body.data.event.title = patchedBooking.event.title;

      await route.fulfill({
        response,
        json: body,
      });
    }
  );


  //  Open My Bookings
  await myBookingsLink.click();
  await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

  const patchedCard = page.locator('#booking-card').filter({ hasText: PATCH.bookingRef });
  await expect(patchedCard).toBeVisible();

  // The list route has run by now, so these values must be set.
  if (!otherLiveBooking || !originalCustomerEmail) {
    throw new Error('Bookings list was not intercepted');
  }

  // Verify list card uses patched values.
  await expect(patchedCard).toContainText(PATCH.bookingRef);
  await expect(patchedCard).toContainText(PATCH.title);
  await expect(patchedCard).toContainText(`${PATCH.quantity} tickets`);
  await expect(patchedCard).toContainText(formattedTotal);

  // Prove another card remains live and different
  const otherLiveCard = page.locator('#booking-card').filter({ hasText: otherLiveBooking.bookingRef });
  await expect(otherLiveCard).toBeVisible();
  await expect(otherLiveCard).not.toContainText(PATCH.bookingRef);
  await expect(otherLiveCard).not.toContainText(PATCH.title);

  //  Open details from the patched card
  await patchedCard.getByRole('button', { name: 'View Details' }).click();

  // URL must use original numeric booking id
  await expect(page).toHaveURL(new RegExp(`/bookings/${targetBookingId}(?:\\?.*)?$`));

  // -------- Detail-page validations
  // reference
  await expect(page.getByText(PATCH.bookingRef, { exact: true }).first()).toBeVisible();
 
  // Event title  
  await expect(page.getByRole('heading', { name: PATCH.title })).toBeVisible();

  // Payment Summary
  await expect(page.getByText('Tickets', { exact: true })).toBeVisible();
  await expect(page.getByText(String(PATCH.quantity), { exact: true })).toBeVisible();

  await expect(page.getByText('Total Paid', { exact: true })).toBeVisible();
  await expect(page.getByText(formattedTotal, { exact: true })).toBeVisible();

  // Customer Details: original live email must stay unchanged
  await expect(page.getByText(originalCustomerEmail, { exact: true })).toBeVisible();

  // Return to My Bookings and locate by patched reference again
  await page.getByRole('button', {name: /back to my bookings/i}).click();
  await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();

  // Re-find using the unique patched booking reference
  const refoundPatchedCard = page.locator('#booking-card').filter({ hasText: PATCH.bookingRef });
  await expect(refoundPatchedCard).toBeVisible();
  await expect(refoundPatchedCard.getByText(PATCH.bookingRef, { exact: true })).toBeVisible();
  await expect(refoundPatchedCard.getByText(formattedTotal, { exact: true })).toBeVisible();

});