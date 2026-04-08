// Feature: react-frontend-app, Property 1: Form submission sends correct payload

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import RegisterPage from './RegisterPage';
import apiClient from '../api/client';

/**
 * Validates: Requirements 1.3, 8.4
 *
 * Property 1: For any valid registration form data (email, username, password,
 * optional first_name and last_name), submitting the form should result in a
 * POST request to /companies/{company_id}/users containing exactly the submitted
 * field values (optional fields omitted when empty).
 */

apiClient.defaults.baseURL = 'http://localhost';

const FIXED_COMPANY = { id: 1, name: 'Test Co', description: null, mode: null, rating: null };

let capturedBody: Record<string, string> = {};

const server = setupServer(
  http.get('http://localhost/companies/', () => {
    return HttpResponse.json([FIXED_COMPANY]);
  }),
  http.post('http://localhost/companies/1/users', async ({ request }) => {
    capturedBody = (await request.json()) as Record<string, string>;
    return new HttpResponse(null, { status: 201 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  capturedBody = {};
  localStorage.clear();
  cleanup();
});
afterAll(() => server.close());

const safeChars = 'abcdefghijklmnopqrstuvwxyz0123456789';

const emailArb = fc
  .tuple(
    fc.stringOf(fc.constantFrom(...safeChars.split('')), { minLength: 1, maxLength: 8 }),
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: 2,
      maxLength: 5,
    }),
  )
  .map(([local, domain]) => `${local}@${domain}.com`);

const usernameArb = fc.stringOf(fc.constantFrom(...(safeChars + '_').split('')), {
  minLength: 1,
  maxLength: 20,
});

const passwordArb = fc.stringOf(fc.constantFrom(...safeChars.split('')), {
  minLength: 1,
  maxLength: 15,
});

const optionalNameArb = fc.oneof(
  fc.constant(''),
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
    minLength: 1,
    maxLength: 10,
  }),
);

describe('RegisterPage form submission payload (Property 1)', () => {
  it(
    'sends correct POST body for arbitrary valid form data',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: emailArb,
            username: usernameArb,
            password: passwordArb,
            first_name: optionalNameArb,
            last_name: optionalNameArb,
          }),
          async ({ email, username, password, first_name, last_name }) => {
            capturedBody = {};

            const user = userEvent.setup();

            render(
              <MemoryRouter>
                <RegisterPage />
              </MemoryRouter>,
            );

            await waitFor(() => {
              expect(screen.getByRole('option', { name: 'Test Co' })).toBeTruthy();
            });

            const emailInput = screen.getByLabelText('Email');
            const usernameInput = screen.getByLabelText('Username');
            const passwordInput = screen.getByLabelText('Password');
            const firstNameInput = screen.getByLabelText('First Name');
            const lastNameInput = screen.getByLabelText('Last Name');

            await user.clear(emailInput);
            await user.type(emailInput, email);

            await user.clear(usernameInput);
            await user.type(usernameInput, username);

            await user.clear(passwordInput);
            await user.type(passwordInput, password);

            await user.clear(firstNameInput);
            if (first_name) await user.type(firstNameInput, first_name);

            await user.clear(lastNameInput);
            if (last_name) await user.type(lastNameInput, last_name);

            await user.click(screen.getByRole('button', { name: /register/i }));

            await waitFor(() => {
              expect(Object.keys(capturedBody).length).toBeGreaterThan(0);
            });

            const requiredMatch =
              capturedBody.email === email &&
              capturedBody.username === username &&
              capturedBody.password === password;

            const firstNameOk = first_name
              ? capturedBody.first_name === first_name
              : !('first_name' in capturedBody);

            const lastNameOk = last_name
              ? capturedBody.last_name === last_name
              : !('last_name' in capturedBody);

            const expectedKeys = new Set(['email', 'username', 'password']);
            if (first_name) expectedKeys.add('first_name');
            if (last_name) expectedKeys.add('last_name');
            const noExtraFields = Object.keys(capturedBody).every((k) => expectedKeys.has(k));

            cleanup();

            return requiredMatch && firstNameOk && lastNameOk && noExtraFields;
          },
        ),
        { numRuns: 10 },
      );
    },
    60000,
  );
});

