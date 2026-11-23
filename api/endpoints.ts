export const ENDPOINTS = {
  auth: '/auth',
  bookings: '/booking',
  bookingById: (id: number | string): string => `/booking/${id}`,
} as const;
