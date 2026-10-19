import { Page } from '@playwright/test';

// -------------------- Mock events Data -----------------------
const daysFromNow = (d: number) => new Date(Date.now() + d * 864e5).toISOString();

export const mockEvents = [
  {
    id: 1001,
    title: 'Hyderabad Cloud Engineering Conference',
    description:
      'A two-day conference for cloud engineers, platform teams, DevOps practitioners, and technology leaders.',
    category: 'Conference',
    venue: 'HITEC Convention Centre',
    city: 'Hyderabad',
    eventDate: daysFromNow(30),
    price: '1800',
    totalSeats: 600,
    availableSeats: 154,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    isStatic: true,
    userId: null,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  },
  {
    id: 1002,
    title: 'Delhi Heritage Festival',
    description:
      'A cultural festival with food, crafts, folk music, dance performances, and heritage walks.',
    category: 'Festival',
    venue: 'India Gate Lawns',
    city: 'Delhi',
    eventDate: daysFromNow(60),
    price: '450',
    totalSeats: 4000,
    availableSeats: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800',
    isStatic: true,
    userId: null,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  },
  {
    id: 1003,
    title: 'Mumbai Harbour Music Concert',
    description: 'An evening of live music featuring popular artists, coastal food stalls, and a waterfront stage.',
    category: 'Concert',
    venue: 'Jio World Garden',
    city: 'Mumbai',
    eventDate: daysFromNow(45),
    price: '2200',
    totalSeats: 2500,
    availableSeats: 730,
    imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
    isStatic: true,
    userId: null,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  },
  {
    id: 1004,
    title: 'Bangalore Data Visualization Workshop',
    description: 'A hands-on workshop on storytelling with data, dashboard design, and practical visualization techniques.',
    category: 'Workshop',
    venue: 'Indiranagar Innovation Hub',
    city: 'Bangalore',
    eventDate: daysFromNow(15),
    price: '950',
    totalSeats: 80,
    availableSeats: 28,
    imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800',
    isStatic: true,
    userId: null,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  },
];

// ----------------------- Mock API helper function -----------------
export async function installEventApiMocks(page: Page) {
  // Detail endpoint:
  // GET /api/events/1001
  await page.route('**/api/events/*', async (route) => {
    const url = new URL(route.request().url());
    const eventId = Number(url.pathname.split('/').pop());

    const event = mockEvents.find((item) => item.id === eventId);

    if (!event) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({success: false, message: `Mock event ${eventId} was not found`,}),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({success: true,data: event,}),
    });
  });

  // Catalog endpoint:
  // GET /api/events?page=1&limit=12
  // GET /api/events?search=hyderabad&category=Conference&city=Hyderabad&page=1&limit=12
  await page.route('**/api/events?**', async (route) => {
    const url = new URL(route.request().url());

    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const category = (url.searchParams.get('category') || '').trim();
    const city = (url.searchParams.get('city') || '').trim();

    const filteredEvents = mockEvents.filter((event) => {
      const matchesSearch =
        !search ||
        event.title.toLowerCase().includes(search) ||
        event.venue.toLowerCase().includes(search) ||
        event.city.toLowerCase().includes(search);
      const matchesCategory = !category || event.category === category;
      const matchesCity = !city || event.city === city;

      return matchesSearch && matchesCategory && matchesCity;
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: filteredEvents,
        pagination: {
          total: filteredEvents.length,
          page: Number(url.searchParams.get('page') || 1),
          limit: Number(url.searchParams.get('limit') || 12),
          totalPages: 1,
        },
      }),
    });
  });
}