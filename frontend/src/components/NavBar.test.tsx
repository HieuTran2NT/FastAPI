// Feature: react-frontend-app, Property 19: NavBar displays correct content for authenticated user

import { describe, it, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NavBar from './NavBar';
import type { User } from '../types';

/**
 * Validates: Requirements 9.1, 9.2, 8.1, 8.7
 *
 * Property 19: For any authenticated User object, NavBar must display:
 *   - A link to /tasks
 *   - The user's username
 *   - A logout button
 *   - A link to /users iff user.is_admin === true
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Wrap NavBar with a MemoryRouter and a mock AuthContext providing the given user. */
function renderWithAuth(user: User) {
  const mockLogout = vi.fn();
  render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user,
          token: 'test-token',
          login: vi.fn(),
          logout: mockLogout,
          isLoading: false,
        }}
      >
        <NavBar />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { mockLogout };
}

/** Arbitrary generator for a full User object. */
const arbitraryUser = fc.record<User>({
  id: fc.integer({ min: 1 }),
  email: fc.emailAddress(),
  username: fc.string({ minLength: 1, maxLength: 50 }),
  first_name: fc.option(fc.string({ minLength: 1 }), { nil: null }),
  last_name: fc.option(fc.string({ minLength: 1 }), { nil: null }),
  is_active: fc.boolean(),
  is_admin: fc.boolean(),
  company_id: fc.integer({ min: 1 }),
});

describe('NavBar content for authenticated user (Property 19)', () => {
  it(
    'displays tasks link, username, logout button; shows users link iff is_admin (Property 19)',
    () => {
      fc.assert(
        fc.property(arbitraryUser, (user) => {
          // Clean up any previous render before starting a new one
          cleanup();

          renderWithAuth(user);

          // Tasks link must always be present
          const tasksLinks = screen.getAllByRole('link', { name: /^tasks$/i });
          if (tasksLinks.length === 0) return false;

          // Username must always be displayed — use a custom matcher to handle
          // whitespace-only usernames that getByText normalizes away
          const usernameEl = screen.getByText(
            (_content, element) => element?.tagName === 'SPAN' && element.textContent === user.username,
          );
          if (!usernameEl) return false;

          // Logout button must always be present
          const logoutBtn = screen.getByRole('button', { name: /logout/i });
          if (!logoutBtn) return false;

          // Users link present iff is_admin === true
          const usersLinks = screen.queryAllByRole('link', { name: /^users$/i });
          const usersLinkPresent = usersLinks.length > 0;
          if (usersLinkPresent !== user.is_admin) return false;

          return true;
        }),
        { numRuns: 100 },
      );
    },
  );
});
