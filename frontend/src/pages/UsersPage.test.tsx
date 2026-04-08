// Feature: react-frontend-app, Property 17: User list displays all users with required fields

import { describe, it, beforeAll, afterAll, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import UsersPage from './UsersPage';
import apiClient from '../api/client';
import type { User } from '../types';

// ─── Setup ───────────────────────────────────────────────────────────────────

apiClient.defaults.baseURL = 'http://localhost';

const COMPANY_ID = 1;

const mockAdminUser: User = {
  id: 99,
  email: 'admin@example.com',
  username: 'adminuser',
  first_name: 'Admin',
  last_name: 'User',
  is_active: true,
  is_admin: true,
  company_id: COMPANY_ID,
};

function renderUsersPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: mockAdminUser,
          token: 'test-token',
          login: vi.fn(),
          logout: vi.fn(),
          isLoading: false,
        }}
      >
        <UsersPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Printable alphanumeric string, no whitespace-only values. */
const alphanumArb = fc
  .stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_'.split('')),
    { minLength: 1, maxLength: 20 },
  )
  .filter((s) => s.trim().length > 0);

/** Arbitrary User array with unique ids. */
const userArrayArb = fc
  .array(
    fc.record<User>({
      id: fc.integer({ min: 1, max: 10_000 }),
      email: fc.emailAddress(),
      username: alphanumArb,
      first_name: fc.oneof(fc.constant(null), alphanumArb),
      last_name: fc.oneof(fc.constant(null), alphanumArb),
      is_active: fc.boolean(),
      is_admin: fc.boolean(),
      company_id: fc.constant(COMPANY_ID),
    }),
    { minLength: 1, maxLength: 5 },
  )
  .map((users) => {
    const seen = new Set<number>();
    return users.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  })
  .filter((users) => users.length > 0);

// ─── Helper ───────────────────────────────────────────────────────────────────

async function waitForEffects(ms = 50) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

// ─── Property 17 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 8.2
 *
 * Property 17: For any array of users returned by GET /companies/{company_id}/users,
 * every user in the array should appear in the rendered table with all required fields:
 * username, email, first_name (or '—' if null), last_name (or '—' if null), and
 * is_admin displayed as 'Yes' or 'No'.
 */
describe('Property 17: User list displays all users with required fields', () => {
  it(
    'renders every user with username, email, first name, last name, and admin status',
    async () => {
      await fc.assert(
        fc.asyncProperty(userArrayArb, async (users) => {
          server.use(
            http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
              HttpResponse.json(users),
            ),
          );

          const { unmount, container } = renderUsersPage();
          await waitForEffects();

          let pass = true;
          for (const u of users) {
            const cells = Array.from(container.querySelectorAll('td'));

            // username
            if (!cells.some((el) => el.textContent === u.username)) {
              pass = false;
              break;
            }

            // email
            if (!cells.some((el) => el.textContent === u.email)) {
              pass = false;
              break;
            }

            // first_name (or '—')
            const expectedFirstName = u.first_name ?? '—';
            if (!cells.some((el) => el.textContent === expectedFirstName)) {
              pass = false;
              break;
            }

            // last_name (or '—')
            const expectedLastName = u.last_name ?? '—';
            if (!cells.some((el) => el.textContent === expectedLastName)) {
              pass = false;
              break;
            }

            // is_admin as 'Yes' / 'No'
            const expectedAdmin = u.is_admin ? 'Yes' : 'No';
            if (!cells.some((el) => el.textContent === expectedAdmin)) {
              pass = false;
              break;
            }
          }

          unmount();
          server.resetHandlers();
          return pass;
        }),
        { numRuns: 10 },
      );
    },
    60_000,
  );
});

// Feature: react-frontend-app, Property 18: New user appears in list after creation

/**
 * Validates: Requirements 8.5
 *
 * Property 18: For any generated User object, after submitting the create user form
 * (with the POST response mocked to return that user), the new user's username should
 * appear in the rendered table without requiring a full page reload.
 */
describe('Property 18: New user appears in list after creation', () => {
  it(
    'adds the new user to the displayed list after successful form submission',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record<User>({
            id: fc.integer({ min: 1, max: 10_000 }),
            email: fc.emailAddress(),
            username: alphanumArb,
            first_name: fc.oneof(fc.constant(null), alphanumArb),
            last_name: fc.oneof(fc.constant(null), alphanumArb),
            is_active: fc.boolean(),
            is_admin: fc.boolean(),
            company_id: fc.constant(COMPANY_ID),
          }),
          async (newUser) => {
            server.use(
              http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
                HttpResponse.json([]),
              ),
              http.post(`http://localhost/companies/${COMPANY_ID}/users`, () =>
                HttpResponse.json(newUser, { status: 201 }),
              ),
            );

            const { unmount, container } = renderUsersPage();
            await waitForEffects();

            // Fill in required form fields
            await act(async () => {
              const emailInput = container.querySelector<HTMLInputElement>('#email')!;
              fireEvent.change(emailInput, { target: { value: newUser.email } });
            });
            await act(async () => {
              const usernameInput = container.querySelector<HTMLInputElement>('#username')!;
              fireEvent.change(usernameInput, { target: { value: newUser.username } });
            });
            await act(async () => {
              const passwordInput = container.querySelector<HTMLInputElement>('#password')!;
              fireEvent.change(passwordInput, { target: { value: 'TestPassword1!' } });
            });

            // Submit the form
            await act(async () => {
              const submitBtn = screen.getByRole('button', { name: /create user/i });
              fireEvent.click(submitBtn);
            });

            await waitForEffects();

            // Assert the new user's username appears in the table
            const cells = Array.from(container.querySelectorAll('td'));
            const found = cells.some((el) => el.textContent === newUser.username);

            unmount();
            server.resetHandlers();
            return found;
          },
        ),
        { numRuns: 10 },
      );
    },
    60_000,
  );
});
