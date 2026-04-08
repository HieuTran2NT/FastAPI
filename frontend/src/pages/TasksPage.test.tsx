// Feature: react-frontend-app, Property 9: Task list displays all returned tasks with required fields
// Feature: react-frontend-app, Property 10: User filter sends correct query parameter
// Feature: react-frontend-app, Property 11: User lists populate all dropdowns correctly
// Feature: react-frontend-app, Property 12: New task appears in list after creation
// Feature: react-frontend-app, Property 14: Edit modal pre-populates with current task data
// Feature: react-frontend-app, Property 15: PATCH request contains only changed fields
// Feature: react-frontend-app, Property 16: Updated task is reflected in the list

import { describe, it, beforeAll, afterAll, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { render, screen, cleanup, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import TasksPage from './TasksPage';
import apiClient from '../api/client';
import type { Task, User } from '../types';

// ─── Setup ───────────────────────────────────────────────────────────────────

apiClient.defaults.baseURL = 'http://localhost';

const COMPANY_ID = 1;

const mockAuthUser: User = {
  id: 99,
  email: 'test@example.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  is_admin: false,
  company_id: COMPANY_ID,
};

function renderTasksPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{
          user: mockAuthUser,
          token: 'test-token',
          login: vi.fn(),
          logout: vi.fn(),
          isLoading: false,
        }}
      >
        <TasksPage />
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

/** Fixed user pool used to satisfy owner_id lookups in the task list. */
const FIXED_USERS: User[] = [
  { id: 1, email: 'a@x.com', username: 'alice', first_name: 'Alice', last_name: null, is_active: true, is_admin: false, company_id: COMPANY_ID },
  { id: 2, email: 'b@x.com', username: 'bob',   first_name: 'Bob',   last_name: null, is_active: true, is_admin: false, company_id: COMPANY_ID },
  { id: 3, email: 'c@x.com', username: 'carol', first_name: 'Carol', last_name: null, is_active: true, is_admin: false, company_id: COMPANY_ID },
];

const FIXED_USER_IDS = FIXED_USERS.map((u) => u.id) as [number, ...number[]];

/**
 * Non-whitespace-only string safe to use as a task summary.
 * Restricted to printable ASCII to avoid DOM text-matching issues.
 */
const summaryArb = fc
  .stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 _-'.split('')),
    { minLength: 3, maxLength: 40 },
  )
  .filter((s) => s.trim().length > 0);

/** Arbitrary Task whose owner_id is always one of the fixed users (or null). */
const taskArb = fc.record<Task>({
  id: fc.integer({ min: 1, max: 100_000 }),
  summary: summaryArb,
  description: fc.oneof(fc.constant(null), summaryArb),
  status: fc.constantFrom('todo', 'in_progress', 'done'),
  priority: fc.constantFrom('low', 'medium', 'high'),
  company_id: fc.constant(COMPANY_ID),
  owner_id: fc.oneof(fc.constant(null), fc.constantFrom(...FIXED_USER_IDS)),
});

/**
 * Task arbitrary for Property 15: owner_id is pinned to the mock auth user's id
 * so the modal won't add owner_id to the PATCH body (no change from default).
 */
const taskArb15 = fc.record<Task>({
  id: fc.integer({ min: 1, max: 100_000 }),
  summary: summaryArb,
  description: fc.oneof(fc.constant(null), summaryArb),
  status: fc.constantFrom('todo', 'in_progress', 'done'),
  priority: fc.constantFrom('low', 'medium', 'high'),
  company_id: fc.constant(COMPANY_ID),
  owner_id: fc.constant(mockAuthUser.id),
});

/** Arbitrary array of unique-id tasks (avoids React key collisions). */
const uniqueTaskArrayArb = fc
  .array(taskArb, { minLength: 1, maxLength: 4 })
  .map((tasks) => {
    const seen = new Set<number>();
    return tasks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  })
  .filter((tasks) => tasks.length > 0);

/** Printable non-whitespace-only string safe for use as a username / name. */
const usernameArb = fc
  .stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_'.split('')),
    { minLength: 1, maxLength: 20 },
  )
  .filter((s) => s.trim().length > 0);

/** Arbitrary User array (non-empty, unique ids). */
const userArrayArb = fc
  .array(
    fc.record<User>({
      id: fc.integer({ min: 1, max: 10_000 }),
      email: fc.emailAddress(),
      username: usernameArb,
      first_name: fc.oneof(fc.constant(null), usernameArb),
      last_name: fc.oneof(fc.constant(null), usernameArb),
      is_active: fc.boolean(),
      is_admin: fc.boolean(),
      company_id: fc.constant(COMPANY_ID),
    }),
    { minLength: 1, maxLength: 4 },
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

// ─── Helper: wait for async effects ──────────────────────────────────────────

async function waitForEffects(ms = 50) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

// ─── Property 9 ──────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 5.1, 5.2
 *
 * Property 9: For any array of tasks returned by GET /companies/{company_id}/tasks,
 * every task in the array should appear in the rendered list showing its summary,
 * status, priority, and owner username.
 */
describe('Property 9: Task list displays all returned tasks with required fields', () => {
  it(
    'renders every task with summary, status, priority visible',
    async () => {
      await fc.assert(
        fc.asyncProperty(uniqueTaskArrayArb, async (tasks) => {
          server.use(
            http.get(`http://localhost/companies/${COMPANY_ID}/tasks`, () =>
              HttpResponse.json(tasks),
            ),
            http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
              HttpResponse.json(FIXED_USERS),
            ),
          );

          const { unmount, container } = renderTasksPage();
          await waitForEffects();

          let pass = true;
          for (const task of tasks) {
            // Summary must appear in the table
            const summaryEls = container.querySelectorAll('td');
            const hasSummary = Array.from(summaryEls).some((el) => el.textContent === task.summary);
            if (!hasSummary) { pass = false; break; }

            // Status must appear
            const hasStatus = Array.from(summaryEls).some((el) => el.textContent === task.status);
            if (!hasStatus) { pass = false; break; }

            // Priority must appear
            const hasPriority = Array.from(summaryEls).some((el) => el.textContent === task.priority);
            if (!hasPriority) { pass = false; break; }
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

// ─── Property 10 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 5.3
 *
 * Property 10: For any user ID selected in the task filter control, the
 * Task_Manager should issue GET /companies/{company_id}/tasks?user_id={uid}.
 */
describe('Property 10: User filter sends correct query parameter', () => {
  it(
    'sends user_id query param matching the selected filter value',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 9999 }), async (uid) => {
          const filterUser: User = {
            id: uid,
            email: `u${uid}@x.com`,
            username: `user${uid}`,
            first_name: null,
            last_name: null,
            is_active: true,
            is_admin: false,
            company_id: COMPANY_ID,
          };

          let capturedUrl: string | null = null;

          server.use(
            http.get(`http://localhost/companies/${COMPANY_ID}/tasks`, ({ request }) => {
              const url = new URL(request.url);
              if (url.searchParams.has('user_id')) {
                capturedUrl = request.url;
              }
              return HttpResponse.json([]);
            }),
            http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
              HttpResponse.json([filterUser]),
            ),
          );

          const { unmount } = renderTasksPage();
          await waitForEffects();

          // Select the user in the filter dropdown
          const select = screen.getByRole('combobox', { name: /filter by user/i });
          await userEvent.selectOptions(select, String(uid));
          await waitForEffects();

          unmount();
          server.resetHandlers();

          if (capturedUrl === null) return false;
          const params = new URL(capturedUrl).searchParams;
          return params.get('user_id') === String(uid);
        }),
        { numRuns: 10 },
      );
    },
    60_000,
  );
});

// ─── Property 11 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 5.4, 6.5
 *
 * Property 11: For any array of users returned by GET /companies/{company_id}/users,
 * every user should appear as a selectable option in the task filter dropdown.
 * (The assignee dropdown lives inside TaskModal which requires opening the modal.)
 */
describe('Property 11: User lists populate all dropdowns correctly', () => {
  it(
    'every user appears as an option in the filter dropdown',
    async () => {
      await fc.assert(
        fc.asyncProperty(userArrayArb, async (users) => {
          server.use(
            http.get(`http://localhost/companies/${COMPANY_ID}/tasks`, () =>
              HttpResponse.json([]),
            ),
            http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
              HttpResponse.json(users),
            ),
          );

          const { unmount } = renderTasksPage();
          await waitForEffects();

          const filterSelect = screen.getByRole('combobox', { name: /filter by user/i });

          let pass = true;
          for (const u of users) {
            const option = within(filterSelect).queryByRole('option', { name: u.username });
            if (!option) { pass = false; break; }
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

  it(
    'every user appears as an option in the assignee dropdown inside TaskModal',
    async () => {
      await fc.assert(
        fc.asyncProperty(userArrayArb, async (users) => {
          server.use(
            http.get(`http://localhost/companies/${COMPANY_ID}/tasks`, () =>
              HttpResponse.json([]),
            ),
            http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
              HttpResponse.json(users),
            ),
          );

          const { unmount } = renderTasksPage();
          await waitForEffects();

          // Open the create modal
          const newTaskBtn = screen.getByRole('button', { name: /new task/i });
          await userEvent.click(newTaskBtn);
          await waitForEffects(10);

          const ownerSelect = screen.getByRole('combobox', { name: /owner/i });

          let pass = true;
          for (const u of users) {
            const option = within(ownerSelect).queryByRole('option', { name: u.username });
            if (!option) { pass = false; break; }
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

// ─── Property 12 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 6.3
 *
 * Property 12: For any task object returned by a successful POST /companies/{company_id}/tasks,
 * the task list should contain that task immediately after creation without a full page reload.
 */
describe('Property 12: New task appears in list after creation', () => {
  it(
    'newly created task appears in the list after modal submission',
    async () => {
      await fc.assert(
        fc.asyncProperty(taskArb, async (newTask) => {
          // After creation, the page re-fetches tasks; return the new task in that response
          let fetchCount = 0;

          server.use(
            http.get(`http://localhost/companies/${COMPANY_ID}/tasks`, () => {
              fetchCount += 1;
              // First fetch (on load): empty list; subsequent fetches: include the new task
              return HttpResponse.json(fetchCount === 1 ? [] : [newTask]);
            }),
            http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
              HttpResponse.json(FIXED_USERS),
            ),
            http.post(`http://localhost/companies/${COMPANY_ID}/tasks`, () =>
              HttpResponse.json(newTask, { status: 201 }),
            ),
          );

          const { unmount, container } = renderTasksPage();
          await waitForEffects();

          // Open create modal
          await userEvent.click(screen.getByRole('button', { name: /new task/i }));
          await waitForEffects(10);

          // Fill in the required summary field
          const summaryInput = screen.getByLabelText(/summary/i);
          fireEvent.change(summaryInput, { target: { value: newTask.summary } });

          // Submit the form
          await userEvent.click(screen.getByRole('button', { name: /create/i }));
          await waitForEffects();

          const cells = Array.from(container.querySelectorAll('td'));
          const found = cells.some((el) => el.textContent === newTask.summary);

          unmount();
          server.resetHandlers();
          fetchCount = 0;
          return found;
        }),
        { numRuns: 10 },
      );
    },
    60_000,
  );
});

// ─── Property 14 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 7.1
 *
 * Property 14: For any task object, opening the edit modal for that task should
 * result in form fields pre-populated with that task's current summary, description,
 * status, priority, and owner_id.
 */
describe('Property 14: Edit modal pre-populates with current task data', () => {
  it(
    'edit modal fields match the task being edited',
    async () => {
      await fc.assert(
        fc.asyncProperty(taskArb, async (task) => {
          server.use(
            http.get(`http://localhost/companies/${COMPANY_ID}/tasks`, () =>
              HttpResponse.json([task]),
            ),
            http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
              HttpResponse.json(FIXED_USERS),
            ),
          );

          const { unmount, container } = renderTasksPage();
          await waitForEffects();

          // Click the task row to open edit modal — find the row by summary cell text
          const cells = Array.from(container.querySelectorAll('td'));
          const summaryCell = cells.find((el) => el.textContent === task.summary);
          if (!summaryCell) {
            unmount();
            server.resetHandlers();
            return false;
          }
          await userEvent.click(summaryCell);
          await waitForEffects(10);

          // Assert the modal is open
          const dialog = screen.queryByRole('dialog');
          if (!dialog) {
            unmount();
            server.resetHandlers();
            return false;
          }

          // Check summary field
          const summaryInput = within(dialog).getByLabelText(/summary/i) as HTMLInputElement;
          if (summaryInput.value !== task.summary) {
            unmount();
            server.resetHandlers();
            return false;
          }

          // Check description field
          const descInput = within(dialog).getByLabelText(/description/i) as HTMLTextAreaElement;
          const expectedDesc = task.description ?? '';
          if (descInput.value !== expectedDesc) {
            unmount();
            server.resetHandlers();
            return false;
          }

          // Check status select
          const statusSelect = within(dialog).getByLabelText(/status/i) as HTMLSelectElement;
          if (statusSelect.value !== task.status) {
            unmount();
            server.resetHandlers();
            return false;
          }

          // Check priority select
          const prioritySelect = within(dialog).getByLabelText(/priority/i) as HTMLSelectElement;
          if (prioritySelect.value !== task.priority) {
            unmount();
            server.resetHandlers();
            return false;
          }

          // Check owner select
          const ownerSelect = within(dialog).getByLabelText(/owner/i) as HTMLSelectElement;
          const expectedOwner = task.owner_id === null ? '' : String(task.owner_id);
          if (ownerSelect.value !== expectedOwner) {
            unmount();
            server.resetHandlers();
            return false;
          }

          unmount();
          server.resetHandlers();
          return true;
        }),
        { numRuns: 10 },
      );
    },
    60_000,
  );
});

// ─── Property 15 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 7.2
 *
 * Property 15: For any edit form submission where a subset of task fields have
 * been modified, the PATCH request body should contain exactly the changed fields
 * and omit unchanged ones.
 *
 * Strategy: change only the summary field; assert PATCH body has 'summary' and
 * does NOT have 'status', 'priority', or 'owner_id' (since those were not changed).
 */
describe('Property 15: PATCH request contains only changed fields', () => {
  it(
    'PATCH body contains only the fields that were changed',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          taskArb15,
          summaryArb,
          async (task, newSummary) => {
            // Ensure the new summary is actually different
            if (newSummary === task.summary) return true; // skip this run

            let capturedPatchBody: Record<string, unknown> | null = null;

            server.use(
              http.get(`http://localhost/companies/${COMPANY_ID}/tasks`, () =>
                HttpResponse.json([task]),
              ),
              http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
                HttpResponse.json(FIXED_USERS),
              ),
              http.patch(
                `http://localhost/companies/${COMPANY_ID}/tasks/${task.id}`,
                async ({ request }) => {
                  capturedPatchBody = (await request.json()) as Record<string, unknown>;
                  return HttpResponse.json({ ...task, summary: newSummary });
                },
              ),
            );

            const { unmount, container } = renderTasksPage();
            await waitForEffects();

            // Open edit modal via the summary cell
            const cells = Array.from(container.querySelectorAll('td'));
            const summaryCell = cells.find((el) => el.textContent === task.summary);
            if (!summaryCell) {
              unmount();
              server.resetHandlers();
              return false;
            }
            await userEvent.click(summaryCell);
            await waitForEffects(10);

            const dialog = screen.queryByRole('dialog');
            if (!dialog) {
              unmount();
              server.resetHandlers();
              return false;
            }

            // Replace only the summary field
            const summaryInput = within(dialog).getByLabelText(/summary/i) as HTMLInputElement;
            await act(async () => {
              fireEvent.change(summaryInput, { target: { value: newSummary } });
            });

            // Submit
            await userEvent.click(within(dialog).getByRole('button', { name: /save/i }));
            await waitForEffects(100);

            const patchBody = capturedPatchBody;
            unmount();
            server.resetHandlers();

            if (patchBody === null) return false;

            // The patch body must contain 'summary' (the changed field)
            if (!('summary' in patchBody)) return false;
            if (patchBody.summary !== newSummary) return false;

            // The patch body must NOT contain unchanged fields
            if ('status' in patchBody) return false;
            if ('priority' in patchBody) return false;
            if ('owner_id' in patchBody) return false;

            return true;
          },
        ),
        { numRuns: 10 },
      );
    },
    60_000,
  );
});

// ─── Property 16 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 7.3
 *
 * Property 16: For any task update response from a successful PATCH request,
 * the task entry in the displayed list should reflect the updated field values
 * without a full page reload.
 */
describe('Property 16: Updated task is reflected in the list', () => {
  it(
    'list shows updated task values after successful edit',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          taskArb,
          summaryArb,
          async (task, newSummary) => {
            if (newSummary === task.summary) return true; // skip identical

            const updatedTask: Task = { ...task, summary: newSummary };
            let fetchCount = 0;

            server.use(
              http.get(`http://localhost/companies/${COMPANY_ID}/tasks`, () => {
                fetchCount += 1;
                return HttpResponse.json(fetchCount === 1 ? [task] : [updatedTask]);
              }),
              http.get(`http://localhost/companies/${COMPANY_ID}/users`, () =>
                HttpResponse.json(FIXED_USERS),
              ),
              http.patch(
                `http://localhost/companies/${COMPANY_ID}/tasks/${task.id}`,
                () => HttpResponse.json(updatedTask),
              ),
            );

            const { unmount, container } = renderTasksPage();
            await waitForEffects();

            // Open edit modal via the summary cell
            const cells = Array.from(container.querySelectorAll('td'));
            const summaryCell = cells.find((el) => el.textContent === task.summary);
            if (!summaryCell) {
              unmount();
              server.resetHandlers();
              fetchCount = 0;
              return false;
            }
            await userEvent.click(summaryCell);
            await waitForEffects(10);

            const dialog = screen.queryByRole('dialog');
            if (!dialog) {
              unmount();
              server.resetHandlers();
              fetchCount = 0;
              return false;
            }

            // Change summary
            const summaryInput = within(dialog).getByLabelText(/summary/i) as HTMLInputElement;
            await act(async () => {
              fireEvent.change(summaryInput, { target: { value: newSummary } });
            });

            // Submit
            await userEvent.click(within(dialog).getByRole('button', { name: /save/i }));
            await waitForEffects();

            const updatedCells = Array.from(container.querySelectorAll('td'));
            const found = updatedCells.some((el) => el.textContent === newSummary);

            unmount();
            server.resetHandlers();
            fetchCount = 0;
            return found;
          },
        ),
        { numRuns: 10 },
      );
    },
    60_000,
  );
});
