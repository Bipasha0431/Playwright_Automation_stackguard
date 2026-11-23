import { test as base, expect } from '@playwright/test';
import { ENDPOINTS } from '../api/endpoints';
import { BookingClient } from '../api/BookingClient';
import type { Booking } from '../utils/api-data';
import { ADMIN_PASSWORD, ADMIN_USERNAME, API_BASE_URL, buildBooking } from '../utils/api-data';

export interface CreatedBooking {
  id: number;
  booking: Booking;
}

interface ApiFixtures {
  bookingClient: BookingClient;
  token: string;
  createdBooking: CreatedBooking;
}

export const test = base.extend<ApiFixtures>({
  baseURL: API_BASE_URL,
  extraHTTPHeaders: { 'Content-Type': 'application/json', Accept: 'application/json' },

  bookingClient: async ({ request }, use) => {
    await use(new BookingClient(request));
  },

  token: async ({ request }, use) => {
    const response = await request.post(ENDPOINTS.auth, { data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
    expect(response.status(), 'auth request for fixture token').toBe(200);
    const body = await response.json();
    expect(body.token, 'token returned for fixture credentials').toEqual(expect.any(String));
    await use(body.token);
  },

  createdBooking: async ({ bookingClient, token }, use) => {
    const booking = buildBooking();
    let bookingId: number;
    try {
      const response = await bookingClient.create(booking);
      expect(response.status(), 'fixture booking creation').toBe(200);
      bookingId = (await response.json()).bookingid;
    } catch (error) {
      // The server may have created the booking even though the response failed or timed out.
      const listResponse = await bookingClient.list({ firstname: booking.firstname, lastname: booking.lastname });
      if (listResponse.ok()) {
        for (const { bookingid } of await listResponse.json()) {
          await bookingClient.remove(bookingid, token);
        }
      }
      throw error;
    }
    await use({ id: bookingId, booking });
    // Tests may already have deleted the booking; the status is intentionally not asserted here.
    await bookingClient.remove(bookingId, token);
  },
});

export { expect };
