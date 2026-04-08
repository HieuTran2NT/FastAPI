// Feature: react-frontend-app, Property 7: Authorization header present on every authenticated request
// Feature: react-frontend-app, Property 5: 401 response clears token and redirects to login

import { describe, it, beforeAll, afterAll, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import apiClient from './client';

/**
 * Validates: Requirements 3.4
 *
 * Property 7: For any token value stored in localStorage, every API request
 * made through the Axios client should include an Authorization: Bearer <token>
 * header containing that exact token.
 *
 * The generator uses fc.string({ minLength: 1 }) constrained to characters
 * valid in HTTP header values (printable ASCII, no whitespace) to match
 * real-world JWT token shapes and avoid HTTP header parsing errors.
 */

apiClient.defaults.baseURL = 'http://localhost';

const server = setupServer(
  http.get('http://localhost/test-auth', ({ request }) => {
    const auth = request.headers.get('Authorization');
    return HttpResponse.json({ auth });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

// Generate token strings using characters valid in HTTP header values.
// JWT tokens are base64url-encoded strings: A-Z, a-z, 0-9, -, _, .
// This matches the real-world token shape and avoids HTTP header parse errors.
const tokenArb = fc.stringOf(
  fc.constantFrom(
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.'.split(''),
  ),
  { minLength: 1 },
);

describe('apiClient auth header interceptor', () => {
  it('attaches Bearer token to every request (Property 7)', async () => {
    await fc.assert(
      fc.asyncProperty(tokenArb, async (token) => {
        localStorage.setItem('token', token);

        const response = await apiClient.get<{ auth: string }>('/test-auth');

        return response.data.auth === `Bearer ${token}`;
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Validates: Requirements 3.2, 4.3
 *
 * Property 5: For any token stored in localStorage, when the API returns a 401
 * response, the interceptor must remove the token from localStorage and redirect
 * the browser to /login.
 */

describe('apiClient 401 interceptor', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('clears token and redirects to /login on 401 (Property 5)', async () => {
    // Stub window.location with a valid href so XHR URL resolution works,
    // while still allowing us to observe href assignments made by the interceptor.
    const locationMock = { href: 'http://localhost' };
    vi.stubGlobal('location', locationMock);

    // Register a 401 handler on the already-running server
    server.use(
      http.get('http://localhost/test-401', () => {
        return new HttpResponse(null, { status: 401 });
      }),
    );

    await fc.assert(
      fc.asyncProperty(tokenArb, async (token) => {
        // Reset between runs
        locationMock.href = 'http://localhost';
        localStorage.setItem('token', token);

        // The interceptor rejects the promise; swallow the error
        await apiClient.get('/test-401').catch(() => {});

        const tokenCleared = localStorage.getItem('token') === null;
        const redirected = locationMock.href === '/login';

        return tokenCleared && redirected;
      }),
      { numRuns: 100 },
    );
  });
});
