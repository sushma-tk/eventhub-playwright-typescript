# EventHub Playwright Tests (TypeScript)

End-to-end UI and API test automation for the [EventHub](https://eventhub.rahulshettyacademy.com) event-booking app, written in **Playwright** with **TypeScript**.

The suite covers login, event search and filtering, multi-booking flows, network mocking, modifying live API responses, and a full create-verify-cancel booking flow using both API and UI.

## Tech stack

- [Playwright Test](https://playwright.dev) (Chromium)
- TypeScript (strict mode)
- Node.js
- dotenv for credentials

## What's tested

| Spec file | What it covers |
|---|---|
| `eventhub-login.spec.ts` | Login page loads: heading, email field, Sign In button, Password field, URL check |
| `LoginPage.spec.ts` | Login smoke test, plus the `page` fixture vs. a fresh isolated browser context (state isn't shared) |
| `eventsFiltering.spec.ts` | Search + category + city filters, capturing card details (title, price, seats), opening Book Now from the matching card, clearing filters, and comparing card titles |
| `TwoEventsBooking.spec.ts` | Two bookings in one session through a reusable helper; each verified in My Bookings and on its detail page by booking reference, with "no mix-up" checks |
| `mockedEvents.spec.ts` | Replaces the live events API with a controlled mock dataset using `page.route()`; verifies cards, filters, the detail page, and ticket-total recalculation against the mock data |
| `patchedBookingSummary.spec.ts` | Intercepts the real My Bookings API response and patches a single booking in transit; verifies the patched values in the list and detail views while other bookings stay live |
| `event-book-and-cancel-test.spec.ts` | Creates a booking through the API, seeds the browser session with the API token, verifies it in the UI, cancels it through the API, and confirms it's gone (with `try/finally` cleanup) |


## Setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   npx playwright install   
   ```

2. Create a `.env` file in the project root:

   ```
   EVENTHUB_EMAIL=your-email-here
   EVENTHUB_PASSWORD=your-password-here
   ```

   You need your own EventHub account.

## Running the tests

```bash
# All tests
npx playwright test

# One file
npx playwright test tests/eventsFiltering.spec.ts

# Interactive UI mode
npx playwright test --ui

# Open the HTML report from the last run
npx playwright show-report
```

## Notes

- Tests run against the live EventHub practice site, so results depend on its data and availability.
- `patchedBookingSummary.spec.ts` uses a booking ID from the author's account. Update `targetBookingId` to a booking from your own account before running it.