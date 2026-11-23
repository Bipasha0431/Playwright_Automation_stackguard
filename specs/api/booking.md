# Booking API Test Plan

## Feature summary

The Restful-Booker booking API lets a client obtain an auth token, create bookings, read one booking or list booking ids, fully (PUT) or partially (PATCH) update a booking, and delete it. This plan covers the happy path and round trips for each operation, token-based protection of PUT/PATCH/DELETE, not-found handling, and malformed or incomplete create bodies.

## Base URL / environment

- Base URL: https://restful-booker.herokuapp.com
- Environment: public shared demo (data is shared with other users and is reset periodically). Tests must only touch bookings they create themselves.
- Send `Content-Type: application/json` and `Accept: application/json` on JSON requests. Observed: successful JSON responses are `application/json; charset=utf-8`; all error responses observed are `text/plain; charset=utf-8` with a short text body (no JSON error envelope).

## Endpoints under test

| Endpoint name | Method | Path | Purpose | Auth required |
|---|---|---|---|---|
| auth | POST | /auth | Exchange username and password for a token | No |
| bookings | POST | /booking | Create a booking | No |
| bookings | GET | /booking | List booking ids (supports filters such as firstname and lastname) | No |
| bookingById | GET | /booking/{id} | Read one booking | No |
| bookingById | PUT | /booking/{id} | Full update | Yes (token cookie) |
| bookingById | PATCH | /booking/{id} | Partial update | Yes (token cookie) |
| bookingById | DELETE | /booking/{id} | Delete a booking | Yes (token cookie) |

## Credentials used

- Account: `admin` (the published demo account).
- Password: read from environment variable `API_PASSWORD`. The default, if the variable is unset, is the published demo value for this public demo.
- Authentication: POST /auth with JSON body of username and password returns a JSON body with a `token` string. The token is then sent as a `Cookie` header of the form `token=<token>` on PUT, PATCH and DELETE. Observed: a missing or invalid token gives 403.
- Obtain the token fresh in each scenario by calling POST /auth. Never store token values in the plan or in test data.

## Conventions for all rows

- Every row creates its own booking via POST /booking with unique-ish names (for example a random suffix on firstname/lastname) and deletes it at the end using a valid token. Where a probe unexpectedly creates a booking, the test must delete it too.
- Valid booking body fields: `firstname` (string), `lastname` (string), `totalprice` (number), `depositpaid` (boolean), `bookingdates` (object with `checkin` and `checkout` strings in YYYY-MM-DD), `additionalneeds` (string, optional).
- Never assert ids or tokens by value; assert only that they exist and have the right type.

## Journey table

| Plan ID | Spec ID | Automation Title | Journey | Steps | Expected |
|---|---|---|---|---|---|
| BOOK-01 | SPEC-API-BOOK-001 | Create booking returns id and echoes details | Create with all fields and verify the response schema | 1. POST /booking with valid details including additionalneeds. 2. Check status, content type and body shape. 3. Delete the booking with a valid token. | Status 200, content type application/json. Body has `bookingid` (number) and `booking` object. `booking` echoes firstname, lastname, totalprice (number), depositpaid (boolean), bookingdates.checkin, bookingdates.checkout and additionalneeds exactly as sent. Delete returns 201. |
| BOOK-02 | SPEC-API-BOOK-002 | Created booking can be read back | Round trip create then read | 1. POST /booking with valid details. 2. GET /booking/{id} using the returned id. 3. Delete the booking. | GET status 200, content type application/json. Body fields (firstname, lastname, totalprice, depositpaid, bookingdates, additionalneeds) equal the values sent. The body has no `bookingid` field (observed). |
| BOOK-03 | SPEC-API-BOOK-003 | Booking id appears in the list and filters work | Create with unique names then list with and without filters | 1. POST /booking with a unique firstname and lastname. 2. GET /booking with no filters. 3. GET /booking filtered by that firstname and lastname. 4. Delete the booking. | Unfiltered list: status 200, content type application/json, array of objects each with numeric `bookingid`, and containing the created id. Filtered list: status 200, array containing exactly the created id. |
| BOOK-04 | SPEC-API-BOOK-004 | Full update replaces all fields | PUT then read back | 1. POST /booking with valid details. 2. PUT /booking/{id} with a token and a complete body with different values for every field. 3. GET /booking/{id}. 4. Delete the booking. | PUT status 200, content type application/json, body is the full updated booking (no `bookingid`). GET status 200 and body equals the PUT values. |
| BOOK-05 | SPEC-API-BOOK-005 | Partial update changes only supplied fields | PATCH then read back | 1. POST /booking with valid details. 2. PATCH /booking/{id} with a token and body containing only firstname and totalprice. 3. GET /booking/{id}. 4. Delete the booking. | PATCH status 200, content type application/json. Body has the new firstname and totalprice; lastname, depositpaid, bookingdates and additionalneeds keep the original values. GET returns the same merged booking. |
| BOOK-06 | SPEC-API-BOOK-006 | Delete removes the booking | Delete then read returns not found | 1. POST /booking with valid details. 2. DELETE /booking/{id} with a valid token. 3. GET /booking/{id}. 4. GET /booking filtered by the unique names. | Delete status 201 (Known quirk of the API: 201 Created for a delete), content type text/plain, body "Created". GET status 404, text/plain, body "Not Found". Filtered list returns an empty array. |
| BOOK-07 | SPEC-API-BOOK-007 | PUT without a token is rejected | Missing token on full update | 1. POST /booking with valid details. 2. PUT /booking/{id} with a complete body and no token. 3. Delete the booking with a valid token. | PUT status 403, content type text/plain, body "Forbidden". |
| BOOK-08 | SPEC-API-BOOK-008 | PATCH without a token is rejected | Missing token on partial update | 1. POST /booking with valid details. 2. PATCH /booking/{id} with a firstname change and no token. 3. Delete the booking with a valid token. | PATCH status 403, text/plain, body "Forbidden". |
| BOOK-09 | SPEC-API-BOOK-009 | DELETE without a token is rejected | Missing token on delete | 1. POST /booking with valid details. 2. DELETE /booking/{id} with no token. 3. Delete the booking with a valid token. | DELETE status 403, text/plain, body "Forbidden". |
| BOOK-10 | SPEC-API-BOOK-010 | Invalid token is rejected on PATCH | Token cookie with an invalid value | 1. POST /booking with valid details. 2. PATCH /booking/{id} with a cookie `token=invalid` and a firstname change. 3. Delete the booking with a valid token. | PATCH status 403, text/plain, body "Forbidden". |
| BOOK-11 | SPEC-API-BOOK-011 | Invalid token is rejected on PUT and DELETE | Invalid token on the other protected methods | 1. POST /booking with valid details. 2. PUT /booking/{id} with an invalid token and a complete body. 3. DELETE /booking/{id} with an invalid token. 4. Delete the booking with a valid token. | Both the PUT and the DELETE return status 403, text/plain, body "Forbidden". |
| BOOK-12 | SPEC-API-BOOK-012 | GET of a non-existent id returns 404 | Unknown id on read | 1. Create a booking, delete it, and keep its id as a known-missing id. 2. GET /booking/{id} for that id. 3. GET /booking/abc (non-numeric id). | Both GETs return status 404, text/plain, body "Not Found". The booking was already cleaned up in step 1. |
| BOOK-13 | SPEC-API-BOOK-013 | Suspected bug: PUT on a non-existent id returns 405 | Suspected bug: observed 405 Method Not Allowed with body "Method Not Allowed" | 1. Create a booking, delete it, and keep its id as a known-missing id. 2. PUT /booking/{id} with a valid token and a complete body. | Correct expected behaviour: status 404 with a "Not Found" body, consistent with GET on a missing id. |
| BOOK-14 | SPEC-API-BOOK-014 | Suspected bug: DELETE on a non-existent id returns 405 | Suspected bug: observed 405 Method Not Allowed, also seen when deleting an already-deleted booking | 1. Create a booking and delete it with a valid token. 2. DELETE the same id again with a valid token. | Correct expected behaviour: status 404 with a "Not Found" body. |
| BOOK-15 | SPEC-API-BOOK-015 | Create with a missing required field is rejected | Suspected bug: observed 500 Internal Server Error with text/plain body "Internal Server Error" (retried once, same result) | 1. POST /booking with only firstname. 2. Check the status and body. | Correct expected behaviour: status 400 (client error, not 5xx) with a non-empty error message. |
| BOOK-16 | SPEC-API-BOOK-016 | Create with an empty object is rejected | Suspected bug: observed 500 Internal Server Error for body `{}` | 1. POST /booking with body `{}`. 2. Check the status and body. | Correct expected behaviour: status 400 with a non-empty error message. |
| BOOK-17 | SPEC-API-BOOK-017 | Create with malformed JSON returns 400 | Malformed JSON body | 1. POST /booking with the truncated body `{"firstname":` and a JSON content type. 2. Record the status, content type and body. 3. Verify via GET /booking filtered by a unique name that nothing was created (use a unique firstname in a valid request first, then delete it). | Status 400, content type text/plain, body "Bad Request". |
| BOOK-18 | SPEC-API-BOOK-018 | Suspected bug: wrong field types are accepted on create | Suspected bug: `totalprice` "abc" was accepted, stored as null, and `depositpaid` "yes" was coerced to true, with status 200 | 1. POST /booking with totalprice "abc" and depositpaid "yes" and otherwise valid details. 2. Record the response. 3. Delete the returned booking with a valid token. | Correct expected behaviour: status 400 with an error message, and no booking is created. |

## Open questions / notes

- Error responses are plain text, not JSON, so assertions on errors should check status, content type text/plain and body text only.
- Failed auth returns 200 (not 401), recorded as a known quirk. 
- DELETE returns 201 Created with body "Created". Recorded as a known quirk.
- PUT, DELETE on a non-existent id return 405 rather than 404 (suspected bugs BOOK-13 and BOOK-14). PATCH on a non-existent id was not probed.
- The list endpoint on the shared demo is large (tens of KB) and contains other users' data. Tests must not modify or depend on anything except their own bookings, and should use unique names for filters.
- The 500 on create was reproduced on a retry for the missing-field case; the empty-object case was observed once.
- Environment variable `API_PASSWORD` holds the password; the default is the published demo value.
