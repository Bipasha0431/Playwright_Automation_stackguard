// spec: specs/api/booking.md

import { test, expect } from '../../fixtures/api';
import { JSON_TYPE, TEXT_TYPE, buildBooking, buildUpdatedBooking } from '../../utils/api-data';

test.describe('Booking CRUD API', () => {
  test('SPEC-API-BOOK-001 Create booking returns id and echoes details', async ({ bookingClient, token }) => {
    const booking = buildBooking();
    let createdId: number | undefined;

    try {
      // 1. POST /booking with valid details including additionalneeds.
      const response = await bookingClient.create(booking);
      const body = await response.json();
      createdId = body.bookingid;

      // 2. Check status, content type and body shape.
      // Expected: 200, JSON, bookingid number, booking echoes the request.
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(JSON_TYPE);
      expect(body).toMatchObject({ bookingid: expect.any(Number), booking: expect.any(Object) });
      expect(body.booking).toEqual(booking);
      expect(body.booking.totalprice).toEqual(expect.any(Number));
      expect(body.booking.depositpaid).toEqual(expect.any(Boolean));
    } finally {
      // 3. Delete the booking with a valid token.
      if (createdId !== undefined) {
        const deleteResponse = await bookingClient.remove(createdId, token);
        // Expected: delete returns 201.
        expect(deleteResponse.status()).toBe(201);
      }
    }
  });

  test('SPEC-API-BOOK-002 Created booking can be read back', async ({ bookingClient, createdBooking }) => {
    // 1. POST /booking with valid details (createdBooking fixture).
    // 2. GET /booking/{id} using the returned id.
    const response = await bookingClient.get(createdBooking.id);

    // Expected: 200, JSON, fields equal sent values, no bookingid.
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(JSON_TYPE);
    const body = await response.json();
    expect(body).toEqual(createdBooking.booking);
    expect(body).not.toHaveProperty('bookingid');
  });

  test('SPEC-API-BOOK-003 Booking id appears in the list and filters work', async ({ bookingClient, createdBooking }) => {
    // 1. POST /booking with a unique firstname and lastname (createdBooking fixture).
    // 2. GET /booking with no filters.
    const listResponse = await bookingClient.list();

    // Expected: 200, JSON, array of objects with numeric bookingid containing the created id.
    expect(listResponse.status()).toBe(200);
    expect(listResponse.headers()['content-type']).toMatch(JSON_TYPE);
    const list = await listResponse.json();
    expect(Array.isArray(list)).toBe(true);
    for (const entry of list) {
      expect(entry.bookingid).toEqual(expect.any(Number));
    }
    expect(list).toContainEqual({ bookingid: createdBooking.id });

    // 3. GET /booking filtered by that firstname and lastname.
    const filteredResponse = await bookingClient.list({
      firstname: createdBooking.booking.firstname,
      lastname: createdBooking.booking.lastname,
    });

    // Expected: 200, array containing exactly the created id.
    expect(filteredResponse.status()).toBe(200);
    expect(filteredResponse.headers()['content-type']).toMatch(JSON_TYPE);
    expect(await filteredResponse.json()).toEqual([{ bookingid: createdBooking.id }]);
  });

  test('SPEC-API-BOOK-004 Full update replaces all fields', async ({ bookingClient, createdBooking, token }) => {
    // 1. POST /booking with valid details (createdBooking fixture).
    // 2. PUT /booking/{id} with a token and a complete body with different values for every field.
    const updated = buildUpdatedBooking();
    const putResponse = await bookingClient.update(createdBooking.id, updated, token);

    // Expected: PUT 200, JSON, full updated booking without bookingid.
    expect(putResponse.status()).toBe(200);
    expect(putResponse.headers()['content-type']).toMatch(JSON_TYPE);
    const putBody = await putResponse.json();
    expect(putBody).toEqual(updated);
    expect(putBody).not.toHaveProperty('bookingid');

    // 3. GET /booking/{id}.
    const getResponse = await bookingClient.get(createdBooking.id);

    // Expected: GET 200 and body equals the PUT values.
    expect(getResponse.status()).toBe(200);
    expect(await getResponse.json()).toEqual(updated);
  });

  test('SPEC-API-BOOK-005 Partial update changes only supplied fields', async ({ bookingClient, createdBooking, token }) => {
    // 1. POST /booking with valid details (createdBooking fixture).
    // 2. PATCH /booking/{id} with a token and body containing only firstname and totalprice.
    const changes = { firstname: `Patched${createdBooking.booking.lastname}`, totalprice: 321 };
    const patchResponse = await bookingClient.patch(createdBooking.id, changes, token);

    // Expected: PATCH 200, JSON, new firstname and totalprice, other fields unchanged.
    const merged = { ...createdBooking.booking, ...changes };
    expect(patchResponse.status()).toBe(200);
    expect(patchResponse.headers()['content-type']).toMatch(JSON_TYPE);
    expect(await patchResponse.json()).toEqual(merged);

    // 3. GET /booking/{id}.
    const getResponse = await bookingClient.get(createdBooking.id);

    // Expected: GET returns the same merged booking.
    expect(getResponse.status()).toBe(200);
    expect(await getResponse.json()).toEqual(merged);
  });

  test('SPEC-API-BOOK-006 Delete removes the booking', async ({ bookingClient, createdBooking, token }) => {
    // 1. POST /booking with valid details (createdBooking fixture).
    // 2. DELETE /booking/{id} with a valid token.
    const deleteResponse = await bookingClient.remove(createdBooking.id, token);

    // Expected: 201, text/plain, body "Created".
    expect(deleteResponse.status()).toBe(201);
    expect(deleteResponse.headers()['content-type']).toMatch(TEXT_TYPE);
    expect(await deleteResponse.text()).toBe('Created');

    // 3. GET /booking/{id}.
    const getResponse = await bookingClient.get(createdBooking.id);

    // Expected: 404, text/plain, body "Not Found".
    expect(getResponse.status()).toBe(404);
    expect(getResponse.headers()['content-type']).toMatch(TEXT_TYPE);
    expect(await getResponse.text()).toBe('Not Found');

    // 4. GET /booking filtered by the unique names.
    const listResponse = await bookingClient.list({
      firstname: createdBooking.booking.firstname,
      lastname: createdBooking.booking.lastname,
    });

    // Expected: empty array.
    expect(listResponse.status()).toBe(200);
    expect(await listResponse.json()).toEqual([]);
  });
});
