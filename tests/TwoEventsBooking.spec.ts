import { test, expect, Page } from "@playwright/test";

// ---------- Test data ----------
const EMAIL = process.env.EVENTHUB_EMAIL;
const PASSWORD = process.env.EVENTHUB_PASSWORD;
 
if (!EMAIL || !PASSWORD) {
  throw new Error("Missing EVENTHUB_EMAIL or EVENTHUB_PASSWORD in .env");
}

const CUSTOMER = {
  name: "Sushma",
  email: "sushma@gmail.com",
  phone: "9876543210",
};

// ---------- Event Booking function ----------
// Goes to Events catalog, filters, books, and reads details from the confirmation page
async function createBooking(page: Page,search: string,category: string,city: string,eventTitle: string,quantity: number) {
  await page.goto("/events");
  await page.locator("#event-card").first().waitFor();
  await page.getByRole('textbox', { name: 'Search events, venues…' }).fill(search);
  const categoryDropdown = page.getByRole('combobox').filter({ hasText: 'All Categories' });
  const cityDropdown = page.getByRole('combobox').filter({ hasText: 'All Cities' });
  await expect(categoryDropdown).toHaveCount(1);
  await expect(cityDropdown).toHaveCount(1);
  await categoryDropdown.selectOption(category);
  await cityDropdown.selectOption(city);
  await expect(page.getByTestId('event-card')).toHaveCount(1);
  const eventCard = page.getByTestId('event-card').filter({ hasText: eventTitle });
  await eventCard.getByRole("link", { name: "Book Now" }).click();
  await expect(page.getByLabel('Full Name*', { exact: true })).toBeVisible();

  for (let i = 1; i < quantity; i++) {
    await page.locator('button:has-text("+")').click();
  }
  await page.getByLabel('Full Name*', { exact: true }).fill(CUSTOMER.name);
  await page.getByLabel('Email*', { exact: true }).fill(CUSTOMER.email);
  await page.getByLabel('Phone Number*', { exact: true }).fill(CUSTOMER.phone);
  await page.locator("button").filter({ hasText: "Confirm Booking" }).click();
  await expect(page.getByText("Booking Confirmed! 🎉", { exact: true }),).toBeVisible();

  const ref = ((await page.locator(".booking-ref").textContent()) ?? "").trim();
  const title = ((await page.locator("h1").textContent()) ?? "").trim();
  const tickets = ((await page.locator("//span[text()='Tickets']/following-sibling::span").textContent()) ?? "").trim();
  const total = ((await page.locator("//span[text()='Total']/following-sibling::span").textContent()) ?? "").trim();
  const email = CUSTOMER.email;
  console.log("Booking details:", { ref, title, tickets, total, email });

  return { ref, title, tickets, total, email };
}

test("Two bookings - verify by booking reference", async ({ page }) => {
  // Login ONCE for the whole session
  await page.goto("/login");
  await page.getByLabel('Email', { exact: true }).fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Browse Events →")).toBeVisible();
 
  // First booking and capture details
  const booking1 = await createBooking(
    page,
    "World",
    "Conference",
    "Hyderabad",
    "World Tech Summit",
    1,
  );
 
  // Verify first booking
  expect(booking1.title).toBe("World Tech Summit");
  expect(booking1.ref).not.toBe("");
  expect(booking1.tickets).toContain("1");
 
  // Second booking (same session, back to Events catalog)
  const booking2 = await createBooking(
    page,
    "Dilli",
    "Festival",
    "Delhi",
    "Dilli Diwali Mela",
    2,
  );
 
  // Verify second booking is different from first
  expect(booking2.ref).not.toBe("");
  expect(booking2.ref).not.toBe(booking1.ref);
  expect(booking2.title).not.toBe(booking1.title);
  expect(booking2.tickets).toContain("2");
 
  const bookings = [booking1, booking2];
 
  // My Bookings - check each booking card: visible, confirmed, title, tickets, total
  await page.locator("#nav-bookings").click();
  for (const booking of bookings) {
    const card = page.locator("#booking-card").filter({ hasText: booking.ref });
    await expect(card).toBeVisible();
    await expect(card).toContainText("confirmed");
    await expect(card).toContainText(booking.title);
    await expect(card).toContainText(`${booking.tickets} ticket`);
    await expect(card).toContainText(booking.total);
  }
 
  // Detail page - open each booking from My Bookings and verify it
  for (const booking of bookings) {
    const otherBooking = bookings.find((b) => b !== booking);
    if (!otherBooking) {
      throw new Error("Could not find the other booking");
    }
 
    await page.locator("#nav-bookings").click();
    await page.locator("#booking-card").filter({ hasText: booking.ref }).getByText("View Details").click();
 
    await expect(page.locator("main nav")).toContainText(booking.ref); // breadcrumb reference
    await expect(page.getByRole("heading", { name: booking.title }),).toBeVisible(); // event title
    await expect(page.getByText(booking.email)).toBeVisible(); // customer email
 
    const summary = page.getByText("Payment Summary").locator("..");
    const tickets = summary.locator("xpath=.//span[text()='Tickets']/following-sibling::span",);
    await expect(tickets).toHaveText(booking.tickets); // tickets
    await expect(summary).toContainText(booking.total); // total
 
    // numeric booking id from the detail page
    const idText = (await page.locator("//span[text()='Booking ID']/following-sibling::span").textContent()) ?? "";
    const bookingId = idText.replace("#", "").trim();
    expect(bookingId).toMatch(/^\d+$/); // numeric booking id
 
    await expect(page.getByText(otherBooking.ref)).toHaveCount(0); // no mix-up
    await expect(page.getByText(otherBooking.title)).toHaveCount(0);
  }
});
