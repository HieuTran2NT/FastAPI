// Feature: react-frontend-app, Property 8: Protected routes redirect unauthenticated users

import { describe, it, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, act, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

/**
 * Validates: Requirements 4.1
 *
 * Property 8: For any protected path ('/tasks', '/users'), rendering
 * ProtectedRoute without an authenticated user (empty localStorage) must
 * redirect to '/login'.
 */

afterEach(() => {
  localStorage.clear();
  cleanup();
});

/** Captures the current pathname so we can assert on it after render. */
let capturedPathname: string | null = null;

function PathnameCapture() {
  const { pathname } = useLocation();
  capturedPathname = pathname;
  return null;
}

function Child() {
  return <div data-testid="child">Protected Content</div>;
}

describe('ProtectedRoute redirect for unauthenticated users', () => {
  it(
    'redirects to /login for any protected path when user is not authenticated (Property 8)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('/tasks', '/users'),
          async (path) => {
            localStorage.clear();
            capturedPathname = null;

            // No token in localStorage → AuthProvider will set user=null after loading
            const { unmount } = render(
              <MemoryRouter initialEntries={[path]}>
                <AuthProvider>
                  <ProtectedRoute>
                    <Child />
                  </ProtectedRoute>
                  <PathnameCapture />
                </AuthProvider>
              </MemoryRouter>,
            );

            // Wait for AuthProvider's useEffect (session restore) to finish
            await act(async () => {
              await new Promise((r) => setTimeout(r, 50));
            });

            const pathname = capturedPathname;

            unmount();
            localStorage.clear();

            return pathname === '/login';
          },
        ),
        { numRuns: 100 },
      );
    },
    30_000,
  );
});
