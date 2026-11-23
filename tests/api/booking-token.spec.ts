// spec: specs/api/booking.md
import { test, expect } from '../../fixtures/api';
import { TEXT_TYPE, buildUpdatedBooking } from '../../utils/api-data';

test.describe('Booking token checks API', () => {
  test('SPEC-API-BOOK-007 PUT without a token is rejected', async ({ bookingClient, createdBooking }) => {
    const response = await bookingClient.update(createdBooking.id, buildUpdatedBooking());

    // Expected: 403, text/plain, "Forbidden".
    expect(response.status()).toBe(403);
    expect(response.headers()['content-type']).toMatch(TEXT_TYPE);
    expect(await response.text()).toBe('Forbidden');
  });

  test('SPEC-API-BOOK-008 PATCH without a token is rejected', async ({ bookingClient, createdBooking }) => {
    const response = await bookingClient.patch(createdBooking.id, { firstname: 'NoTokenChange' });

    // Expected: 403, text/plain, "Forbidden".
    expect(response.status()).toBe(403);
    expect(response.headers()['content-type']).toMatch(TEXT_TYPE);
    expect(await response.text()).toBe('Forbidden');
  });

  test('SPEC-API-BOOK-009 DELETE without a token is rejected', async ({ bookingClient, createdBooking }) => {
    const response = await bookingClient.remove(createdBooking.id);

    // Expected: 403, text/plain, "Forbidden".
    expect(response.status()).toBe(403);
    expect(response.headers()['content-type']).toMatch(TEXT_TYPE);
    expect(await response.text()).toBe('Forbidden');
  });

  test('SPEC-API-BOOK-010 Invalid token is rejected on PATCH', async ({ bookingClient, createdBooking }) => {
    const response = await bookingClient.patch(createdBooking.id, { firstname: 'InvalidTokenChange' }, 'invalid');

    // Expected: 403, text/plain, "Forbidden".
    expect(response.status()).toBe(403);
    expect(response.headers()['content-type']).toMatch(TEXT_TYPE);
    expect(await response.text()).toBe('Forbidden');
  });

  test('SPEC-API-BOOK-011 Invalid token is rejected on PUT and DELETE', async ({ bookingClient, createdBooking }) => {
    const putResponse = await bookingClient.update(createdBooking.id, buildUpdatedBooking(), 'invalid');

    const deleteResponse = await bookingClient.remove(createdBooking.id, 'invalid');

    // Expected: both 403, text/plain, "Forbidden"; cleanup delete (fixture teardown) returns 201.
    for (const response of [putResponse, deleteResponse]) {
      expect(response.status()).toBe(403);
      expect(response.headers()['content-type']).toMatch(TEXT_TYPE);
      expect(await response.text()).toBe('Forbidden');
    }
  });
});
