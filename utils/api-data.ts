import { randomUUID } from 'node:crypto';

export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: { checkin: string; checkout: string };
  additionalneeds?: string;
}

export const API_BASE_URL = 'https://restful-booker.herokuapp.com';

export const ADMIN_USERNAME = 'admin';

// password123 is the published public demo password for restful-booker
export const ADMIN_PASSWORD = process.env.API_PASSWORD ?? 'password123';

const uniqueSuffix = (): string => randomUUID().replace(/-/g, '').slice(0, 12);

export function buildBooking(overrides: Partial<Booking> = {}): Booking {
  const suffix = uniqueSuffix();
  return {
    firstname: `First${suffix}`,
    lastname: `Last${suffix}`,
    totalprice: 150,
    depositpaid: true,
    bookingdates: { checkin: '2026-01-10', checkout: '2026-01-15' },
    additionalneeds: 'Breakfast',
    ...overrides,
  };
}

export function buildUpdatedBooking(): Booking {
  const suffix = uniqueSuffix();
  return {
    firstname: `Upd${suffix}`,
    lastname: `Changed${suffix}`,
    totalprice: 999,
    depositpaid: false,
    bookingdates: { checkin: '2026-03-01', checkout: '2026-03-09' },
    additionalneeds: 'Late checkout',
  };
}

// Error responses are plain text, so a created id may or may not be in the body.
export function parseBookingId(text: string): number | undefined {
  try {
    const { bookingid } = JSON.parse(text);
    return typeof bookingid === 'number' ? bookingid : undefined;
  } catch {
    return undefined;
  }
}

export const JSON_TYPE = /application\/json/;
export const TEXT_TYPE = /text\/plain/;
