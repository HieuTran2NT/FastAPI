// Feature: react-frontend-app, Property 2: Token stored in localStorage on successful login

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { render, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import apiClient from '../api/client';

/**
 * Validates: Requirements 2.3
 *
 * Property 2: For any valid access_token returned by POST /auth/login,
 * the token must be stored in localStorage under the key 'token' after
 * a successful login call.
 */

apiClient.defaults.baseURL = 'http://localhost';

// Base64url character set — safe for HTTP headers and valid JWT segment chars
const base64urlChars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.split('');

const tokenArb = fc.stringOf(fc.constantFrom(...base64urlChars), { minLength: 1 });

/** Build a minimal fake JWT whose payload contains { company_id: 1 } */
function makeFakeJwt(signature: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const payload = btoa(JSON.stringify({ company_id: 1, sub: 'testuser' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${header}.${payload}.${signature}`;
}

const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  is_admin: false,
  company_id: 1,
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
  cleanup();
});
afterAll(() => server.close());

/**
 * A component that exposes a ref-like callback so the test can invoke login
 * imperatively and await it.
 */
let capturedLogin: ((u: string, p: string) => Promise<void>) | null = null;

function LoginCapture() {
  const { login } = useAuth();
  capturedLogin = login;
  return null;
}

describe('AuthContext token storage', () => {
  it(
    'stores access_token in localStorage after successful login (Property 2)',
    async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, async (rawToken) => {
          localStorage.clear();
          capturedLogin = null;

          const jwt = makeFakeJwt(rawToken);

          server.use(
            http.post('http://localhost/auth/login', () =>
              HttpResponse.json({ access_token: jwt, token_type: 'bearer' }),
            ),
            http.get('http://localhost/companies/1/users/me', () =>
              HttpResponse.json(mockUser),
            ),
          );

          // Render the provider so capturedLogin is populated
          render(
            <MemoryRouter>
              <AuthProvider>
                <LoginCapture />
              </AuthProvider>
            </MemoryRouter>,
          );

          // Wait for the initial useEffect (session restore) to finish
          await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
          });

          // Call login and wait for it to complete
          await act(async () => {
            await capturedLogin!('testuser', 'pass');
          });

          const stored = localStorage.getItem('token');

          cleanup();
          server.resetHandlers();

          return stored === jwt;
        }),
        { numRuns: 100 },
      );
    },
    30_000, // 30 s timeout for 100 async property runs
  );
});

// Feature: react-frontend-app, Property 3: User profile loaded into auth state after login

/**
 * Validates: Requirements 2.4
 *
 * Property 3: For any User object returned by GET /companies/{company_id}/users/me
 * following a successful login, the auth context should hold that exact user object.
 */

import type { User } from '../types';

const userArb = fc.record<User>({
  id: fc.integer({ min: 1 }),
  email: fc.emailAddress(),
  username: fc.string({ minLength: 1, maxLength: 30 }),
  first_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 30 })),
  last_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 30 })),
  is_active: fc.boolean(),
  is_admin: fc.boolean(),
  company_id: fc.integer({ min: 1 }),
});

/** Build a fake JWT whose payload contains the given company_id */
function makeFakeJwtForCompany(companyId: number, signature: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const payload = btoa(JSON.stringify({ company_id: companyId, sub: 'testuser' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${header}.${payload}.${signature}`;
}

/** Component that captures the full auth context value */
let capturedUser: User | null | undefined = undefined;

function UserCapture() {
  const { user } = useAuth();
  capturedUser = user;
  return null;
}

describe('AuthContext user profile after login', () => {
  it(
    'loads user profile into auth state after successful login (Property 3)',
    async () => {
      await fc.assert(
        fc.asyncProperty(userArb, async (generatedUser) => {
          localStorage.clear();
          capturedUser = undefined;

          const jwt = makeFakeJwtForCompany(generatedUser.company_id, 'sig');

          server.use(
            http.post('http://localhost/auth/login', () =>
              HttpResponse.json({ access_token: jwt, token_type: 'bearer' }),
            ),
            http.get(
              `http://localhost/companies/${generatedUser.company_id}/users/me`,
              () => HttpResponse.json(generatedUser),
            ),
          );

          const { unmount } = render(
            <MemoryRouter>
              <AuthProvider>
                <LoginCapture />
                <UserCapture />
              </AuthProvider>
            </MemoryRouter>,
          );

          // Wait for initial session-restore useEffect to finish
          await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
          });

          // Invoke login and wait for all state updates
          await act(async () => {
            await capturedLogin!('testuser', 'pass');
          });

          const userAfterLogin = capturedUser;

          unmount();
          server.resetHandlers();
          localStorage.clear();

          return (
            userAfterLogin !== null &&
            userAfterLogin !== undefined &&
            userAfterLogin.id === generatedUser.id &&
            userAfterLogin.email === generatedUser.email &&
            userAfterLogin.username === generatedUser.username &&
            userAfterLogin.first_name === generatedUser.first_name &&
            userAfterLogin.last_name === generatedUser.last_name &&
            userAfterLogin.is_active === generatedUser.is_active &&
            userAfterLogin.is_admin === generatedUser.is_admin &&
            userAfterLogin.company_id === generatedUser.company_id
          );
        }),
        { numRuns: 100 },
      );
    },
    30_000,
  );
});

// Feature: react-frontend-app, Property 4: Session restored from stored token on app init

/**
 * Validates: Requirements 3.1
 *
 * Property 4: For any valid token and User object, if `token` and `company_id`
 * are pre-set in localStorage before the AuthProvider mounts, the context
 * should call GET /companies/{company_id}/users/me and load the returned user.
 */

const sessionUserArb = fc.record<User>({
  id: fc.integer({ min: 1 }),
  email: fc.emailAddress(),
  username: fc.string({ minLength: 1, maxLength: 30 }),
  first_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 30 })),
  last_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 30 })),
  is_active: fc.boolean(),
  is_admin: fc.boolean(),
  company_id: fc.integer({ min: 1 }),
});

const sessionTokenArb = fc.stringOf(fc.constantFrom(...base64urlChars), { minLength: 1 });

let capturedSessionUser: User | null | undefined = undefined;

function SessionUserCapture() {
  const { user, isLoading } = useAuth();
  if (!isLoading) {
    capturedSessionUser = user;
  }
  return null;
}

describe('AuthContext session restore on init', () => {
  it(
    'restores user from stored token on app init (Property 4)',
    async () => {
      await fc.assert(
        fc.asyncProperty(sessionTokenArb, sessionUserArb, async (rawToken, generatedUser) => {
          localStorage.clear();
          capturedSessionUser = undefined;

          // Pre-set localStorage before rendering
          localStorage.setItem('token', rawToken);
          localStorage.setItem('company_id', String(generatedUser.company_id));

          server.use(
            http.get(
              `http://localhost/companies/${generatedUser.company_id}/users/me`,
              () => HttpResponse.json(generatedUser),
            ),
          );

          const { unmount } = render(
            <MemoryRouter>
              <AuthProvider>
                <SessionUserCapture />
              </AuthProvider>
            </MemoryRouter>,
          );

          // Wait for the useEffect + async /me call to complete
          await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
          });

          const userAfterRestore = capturedSessionUser;

          unmount();
          server.resetHandlers();
          localStorage.clear();

          return (
            userAfterRestore !== null &&
            userAfterRestore !== undefined &&
            userAfterRestore.id === generatedUser.id &&
            userAfterRestore.email === generatedUser.email &&
            userAfterRestore.username === generatedUser.username &&
            userAfterRestore.first_name === generatedUser.first_name &&
            userAfterRestore.last_name === generatedUser.last_name &&
            userAfterRestore.is_active === generatedUser.is_active &&
            userAfterRestore.is_admin === generatedUser.is_admin &&
            userAfterRestore.company_id === generatedUser.company_id
          );
        }),
        { numRuns: 100 },
      );
    },
    60_000,
  );
});

// Feature: react-frontend-app, Property 6: Logout clears all auth state

/**
 * Validates: Requirements 3.3
 *
 * Property 6: For any arbitrary token and User, after pre-seeding localStorage
 * and calling logout(), localStorage must have no 'token' or 'company_id' keys,
 * the context user must be null, and the router must have navigated to '/login'.
 */

let capturedLogout: (() => void) | null = null;
let capturedLogoutUser: User | null | undefined = undefined;
let capturedLogoutPathname: string | null = null;

function LogoutCapture() {
  const { logout, user } = useAuth();
  capturedLogout = logout;
  capturedLogoutUser = user;
  return null;
}

import { useLocation } from 'react-router-dom';

function PathnameCapture() {
  const { pathname } = useLocation();
  capturedLogoutPathname = pathname;
  return null;
}

const logoutTokenArb = fc.stringOf(fc.constantFrom(...base64urlChars), { minLength: 1 });

const logoutUserArb = fc.record<User>({
  id: fc.integer({ min: 1 }),
  email: fc.emailAddress(),
  username: fc.string({ minLength: 1, maxLength: 30 }),
  first_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 30 })),
  last_name: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 30 })),
  is_active: fc.boolean(),
  is_admin: fc.boolean(),
  company_id: fc.integer({ min: 1 }),
});

describe('AuthContext logout clears all auth state', () => {
  it(
    'clears localStorage, sets user to null, and navigates to /login on logout (Property 6)',
    async () => {
      await fc.assert(
        fc.asyncProperty(logoutTokenArb, logoutUserArb, async (rawToken, generatedUser) => {
          localStorage.clear();
          capturedLogout = null;
          capturedLogoutUser = undefined;
          capturedLogoutPathname = null;

          // Pre-seed localStorage so session restore loads the user
          localStorage.setItem('token', rawToken);
          localStorage.setItem('company_id', String(generatedUser.company_id));

          server.use(
            http.get(
              `http://localhost/companies/${generatedUser.company_id}/users/me`,
              () => HttpResponse.json(generatedUser),
            ),
          );

          const { unmount } = render(
            <MemoryRouter initialEntries={['/tasks']}>
              <AuthProvider>
                <LogoutCapture />
                <PathnameCapture />
              </AuthProvider>
            </MemoryRouter>,
          );

          // Wait for session restore to complete
          await act(async () => {
            await new Promise((r) => setTimeout(r, 50));
          });

          // Call logout
          await act(async () => {
            capturedLogout!();
          });

          const tokenAfter = localStorage.getItem('token');
          const companyIdAfter = localStorage.getItem('company_id');
          const userAfter = capturedLogoutUser;
          const pathnameAfter = capturedLogoutPathname;

          unmount();
          server.resetHandlers();
          localStorage.clear();

          return (
            tokenAfter === null &&
            companyIdAfter === null &&
            userAfter === null &&
            pathnameAfter === '/login'
          );
        }),
        { numRuns: 100 },
      );
    },
    60_000,
  );
});
