// spec: specs/api/booking.md
import { test, expect } from '../../fixtures/api';
import { TEXT_TYPE, buildBooking, buildUpdatedBooking, parseBookingId } from '../../utils/api-data';

test.describe('Booking error handling API', () => {

  test('SPEC-API-BOOK-012 GET of a non-existent id returns 404', async ({ bookingClient, createdBooking, token }) => {
    // 1. Create a booking, delete it, and keep its id as a known-missing id.
    const deleteResponse = await bookingClient.remove(createdBooking.id, token);
    expect(deleteResponse.status()).toBe(201);

    // 2. GET /booking/{id} for that id.
    const missingResponse = await bookingClient.get(createdBooking.id);

    // 3. GET /booking/abc (non-numeric id).
    const nonNumericResponse = await bookingClient.get('abc');

    // Expected: both 404, text/plain, "Not Found".
    for (const response of [missingResponse, nonNumericResponse]) {
      expect(response.status()).toBe(404);
      expect(response.headers()['content-type']).toMatch(TEXT_TYPE);
      expect(await response.text()).toBe('Not Found');
    }
  });

  test('SPEC-API-BOOK-013 Suspected bug: PUT on a non-existent id returns 405', async ({ bookingClient, createdBooking, token }) => {
    test.fail(true, 'Known bug: PUT on a non-existent booking id returns 405 instead of 404');

    // 1. Create a booking, delete it, and keep its id as a known-missing id.
    const deleteResponse = await bookingClient.remove(createdBooking.id, token);
    expect(deleteResponse.status()).toBe(201);

    // 2. PUT /booking/{id} with a valid token and a complete body.
    const response = await bookingClient.update(createdBooking.id, buildUpdatedBooking(), token);

    // Expected: 404 with a "Not Found" body.
    expect(response.status()).toBe(404);
    expect(await response.text()).toBe('Not Found');
  });

  test('SPEC-API-BOOK-014 Suspected bug: DELETE on a non-existent id returns 405', async ({ bookingClient, createdBooking, token }) => {
    test.fail(true, 'Known bug: DELETE on a non-existent or already-deleted booking returns 405 instead of 404');

    // 1. Create a booking and delete it with a valid token.
    const firstDelete = await bookingClient.remove(createdBooking.id, token);
    expect(firstDelete.status()).toBe(201);

    // 2. DELETE the same id again with a valid token.
    const response = await bookingClient.remove(createdBooking.id, token);

    // Expected: 404 with a "Not Found" body.
    expect(response.status()).toBe(404);
    expect(await response.text()).toBe('Not Found');
  });

  test('SPEC-API-BOOK-015 Create with a missing required field is rejected', async ({ bookingClient }) => {
    test.fail(true, 'Known bug: create with only firstname returns 500 instead of 400');

    // 1. POST /booking with only firstname.
    const response = await bookingClient.create({ firstname: 'OnlyFirstname' });
    const text = await response.text();

    // 2. Record the status and body.
    // Expected: 400 with an error message, and no booking is created.
    expect(response.status()).toBe(400);
    expect(text.length).toBeGreaterThan(0);
  });

  test('SPEC-API-BOOK-016 Create with an empty object is rejected', async ({ bookingClient }) => {
    test.fail(true, 'Known bug: create with an empty object returns 500 instead of 400');

    // 1. POST /booking with body {}.
    const response = await bookingClient.create({});
    const text = await response.text();

    // 2. Record the status and body.
    // Expected: 400 with an error message, and no booking is created.
    expect(response.status()).toBe(400);
    expect(text.length).toBeGreaterThan(0);
  });

  test('SPEC-API-BOOK-017 Create with malformed JSON returns 400', async ({ bookingClient, createdBooking }) => {
    // 1. POST /booking with the truncated body {"firstname": and a JSON content type.
    const response = await bookingClient.create('{"firstname":');

    // 2. Record the status, content type and body.
    // Expected: 400, text/plain, "Bad Request".
    expect(response.status()).toBe(400);
    expect(response.headers()['content-type']).toMatch(TEXT_TYPE);
    expect(await response.text()).toBe('Bad Request');

    // 3. Verify via GET /booking filtered by a unique name that nothing else was created.
    const listResponse = await bookingClient.list({ firstname: createdBooking.booking.firstname });
    expect(listResponse.status()).toBe(200);
    expect(await listResponse.json()).toEqual([{ bookingid: createdBooking.id }]);
  });

  test('SPEC-API-BOOK-018 Suspected bug: wrong field types are accepted on create', async ({ bookingClient, token }) => {
    test.fail(true, 'Known bug: totalprice "abc" and depositpaid "yes" are accepted with 200 instead of 400');

    // 1. POST /booking with totalprice "abc" and depositpaid "yes" and otherwise valid details.
    const response = await bookingClient.create({ ...buildBooking(), totalprice: 'abc', depositpaid: 'yes' });
    const text = await response.text();

    // 3. Delete the returned booking with a valid token.
    const createdId = parseBookingId(text);
    if (createdId !== undefined) {
      await bookingClient.remove(createdId, token);
    }

    // 2. Record the response.
    // Expected: 400 with an error message, and no booking is created.
    expect(response.status()).toBe(400);
    expect(createdId).toBeUndefined();
  });
});
