import { test, expect, request, APIRequestContext } from '@playwright/test';

// ---------- Test data ----------
const API_URL = 'https://api.eventhub.rahulshettyacademy.com/api';

const loginPayload = { email: process.env.EVENTHUB_EMAIL, password: process.env.EVENTHUB_PASSWORD };

const QUANTITY = 2;
const CUSTOMER_NAME = 'Customer Test';
const CUSTOMER_EMAIL = 'customer.test@example.com';
const CUSTOMER_PHONE = '9876543210';

let apiContext: APIRequestContext;
let token: string;

// ---------- Login once ----------
test.beforeAll(async () => {
  // Login with a plain context
  const loginContext = await request.newContext();
  const loginResponse = await loginContext.post(API_URL + '/auth/login', { data: loginPayload });
  expect(loginResponse.ok()).toBeTruthy();
  token = (await loginResponse.json()).token;
  //console.log(token);
  await loginContext.dispose();
 
  // API context with baseURL + token for all requests
  apiContext = await request.newContext({
    baseURL: API_URL + '/',
    extraHTTPHeaders: { Authorization: 'Bearer ' + token },
  });
});

test.afterAll(async () => {
  await apiContext.dispose();
});

// ---------- Test ----------
test('Create booking via API, verify in UI, cancel via API', async ({ page }) => {
  // Pick a live event with at least 2 seats
  const eventsResponse = await apiContext.get('events');
  const events = (await eventsResponse.json()).data;
  const event = events.find((e: any) => e.availableSeats >= QUANTITY && new Date(e.eventDate) > new Date());
  const expectedTotal = Number(event.price) * QUANTITY;

  // Create booking
  const createResponse = await apiContext.post('bookings', {
    data: {
      eventId: event.id,
      quantity: QUANTITY,
      customerName: CUSTOMER_NAME,
      customerEmail: CUSTOMER_EMAIL,
      customerPhone: CUSTOMER_PHONE,
    },
  });
   expect(createResponse.ok()).toBeTruthy();
   const booking = (await createResponse.json()).data;
   const bookingId = booking.id;
   const bookingRef = booking.bookingRef;
   console.log('Booking created:', JSON.stringify(booking, null, 2));

  // Look up by reference and compare
  // calls the API to fetch the new booking by its reference code.
  // and then checks that the booking it gets back is the same one you just created.
  const lookupResponse = await apiContext.get('bookings/ref/' + bookingRef);
  const lookup = (await lookupResponse.json()).data;

  expect(lookup.id).toBe(bookingId);
  expect(lookup.bookingRef).toBe(bookingRef);
  expect(lookup.quantity).toBe(QUANTITY);
  expect(lookup.totalPrice).toBe(booking.totalPrice);


  let deleted = false;

  try {
    await page.addInitScript(value => {
      window.localStorage.setItem('eventhub_token', value);
    }, token);

    // My Bookings card
    await page.goto('/bookings');
    const card = page.locator('[data-testid="booking-card"]').filter({ hasText: bookingRef });
    await expect(card).toContainText(event.title);
    await expect(card).toContainText(QUANTITY + ' ticket');
    await expect(card).toContainText(String(expectedTotal));

    // Details page
    await card.getByText('View Details').click();
    await expect(page).toHaveURL('/bookings/' + bookingId);
    await expect(page.locator('body')).toContainText(bookingRef);
    await expect(page.locator('body')).toContainText(event.title);
    await expect(page.locator('body')).toContainText(event.category);
    await expect(page.locator('body')).toContainText(event.city);
    await expect(page.locator('body')).toContainText(String(expectedTotal));
    await expect(page.locator('body')).toContainText(CUSTOMER_EMAIL);

    // Cancel via API
    const deleteResponse = await apiContext.delete('bookings/' + bookingId);
    expect(deleteResponse.ok()).toBeTruthy();
    deleted = true;

    // Lookup again should fail
    const afterDelete = await apiContext.get('bookings/ref/' + bookingRef);
    expect(afterDelete.status()).toBe(404);

    // Card should be gone
    await page.goto('/bookings');
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    await expect(page.getByTestId('booking-card').first()).toBeVisible();
    await expect(page.getByText(bookingRef)).toHaveCount(0);

  } finally {
    // if the test failed before deleting, delete the booking now
    if (!deleted) {
      await apiContext.delete('bookings/' + bookingId);
    }
  }
});