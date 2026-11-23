import type { APIRequestContext, APIResponse } from '@playwright/test';
import { ENDPOINTS } from './endpoints';

export class BookingClient {
  constructor(private readonly request: APIRequestContext) {}

  private authHeaders(token?: string): Record<string, string> {
    return token === undefined ? {} : { Cookie: `token=${token}` };
  }

  create(body: object | string): Promise<APIResponse> {
    return this.request.post(ENDPOINTS.bookings, { data: body });
  }

  list(filter?: { firstname?: string; lastname?: string }): Promise<APIResponse> {
    return this.request.get(ENDPOINTS.bookings, { params: { ...filter } });
  }

  get(id: number | string): Promise<APIResponse> {
    return this.request.get(ENDPOINTS.bookingById(id));
  }

  update(id: number | string, body: object, token?: string): Promise<APIResponse> {
    return this.request.put(ENDPOINTS.bookingById(id), { data: body, headers: this.authHeaders(token) });
  }

  patch(id: number | string, body: object, token?: string): Promise<APIResponse> {
    return this.request.patch(ENDPOINTS.bookingById(id), { data: body, headers: this.authHeaders(token) });
  }

  remove(id: number | string, token?: string): Promise<APIResponse> {
    return this.request.delete(ENDPOINTS.bookingById(id), { headers: this.authHeaders(token) });
  }
}
