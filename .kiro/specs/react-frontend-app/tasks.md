# Implementation Plan: React Frontend App

## Overview

Build a React SPA (Vite + TypeScript) served via Nginx in Docker, integrating with the existing FastAPI backend. Tasks are ordered to build incrementally: scaffold → types → API client → auth → routing → pages → Docker → tests.

## Tasks

- [x] 1. Scaffold the frontend project
  - Create `frontend/` directory with `package.json` (dependencies: react, react-dom, react-router-dom, axios; devDependencies: vite, @vitejs/plugin-react, typescript, vitest, @testing-library/react, @testing-library/user-event, msw, fast-check, @types/react, @types/react-dom)
  - Create `vite.config.ts` with React plugin and Vitest configuration
  - Create `index.html` entry point
  - Create `src/main.tsx` mounting `<App />` into `#root`
  - _Requirements: 10.4, 10.5_

- [x] 2. Define TypeScript types
  - [x] 2.1 Create `src/types/index.ts` with all interfaces
    - Define `Company`, `User`, `Task`, `TaskCreate`, `TaskUpdate`, `UserCreate`, `TaskStatus`, `TaskPriority`
    - Mirror the backend Pydantic schemas exactly
    - _Requirements: 5.2, 6.1, 7.1, 8.2_

- [x] 3. Implement the Axios API client
  - [x] 3.1 Create `src/api/client.ts`
    - Create Axios instance with `baseURL: import.meta.env.VITE_API_URL`
    - Add request interceptor: read token from `localStorage`, attach `Authorization: Bearer <token>` header
    - Add response interceptor: on 401, remove token from `localStorage` and redirect to `/login`
    - _Requirements: 3.4, 4.3_

  - [x] 3.2 Write property test for auth header interceptor (Property 7)
    - **Property 7: Authorization header present on every authenticated request**
    - **Validates: Requirements 3.4**
    - Use `fc.string({ minLength: 1 })` to generate arbitrary token strings; assert header equals `Bearer <token>`

  - [x] 3.3 Write property test for 401 interceptor (Property 5)
    - **Property 5: 401 response clears token and redirects to login**
    - **Validates: Requirements 3.2, 4.3**
    - Use msw to return 401; assert `localStorage` token removed and location set to `/login`

- [ ] 4. Implement AuthContext and session logic
  - [x] 4.1 Create `src/context/AuthContext.tsx`
    - Define `AuthContextValue` interface with `user`, `token`, `login`, `logout`, `isLoading`
    - On mount: read token from `localStorage`; if present, call `GET /companies/{company_id}/users/me` to restore session; on 401 clear token
    - `login(username, password)`: POST to `/auth/login` (form-encoded), store token, fetch `/me`, set user in state, navigate to `/tasks`
    - `logout()`: remove token from `localStorage`, clear user state, navigate to `/login`
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3_

  - [x] 4.2 Write property test for token storage on login (Property 2)
    - **Property 2: Token stored in localStorage on successful login**
    - **Validates: Requirements 2.3**
    - Use `fc.string({ minLength: 1 })` for token; mock `/auth/login` response; assert `localStorage.getItem('token')` equals token

  - [x] 4.3 Write property test for user profile loaded after login (Property 3)
    - **Property 3: User profile loaded into auth state after login**
    - **Validates: Requirements 2.4**
    - Generate arbitrary `User` objects; mock `/me` response; assert context `user` equals generated object

  - [x] 4.4 Write property test for session restore on init (Property 4)
    - **Property 4: Session restored from stored token on app init**
    - **Validates: Requirements 3.1**
    - Pre-set `localStorage` token; render `AuthContext`; assert `/me` is called and user is loaded

  - [x] 4.5 Write property test for logout clears all auth state (Property 6)
    - **Property 6: Logout clears all auth state**
    - **Validates: Requirements 3.3**
    - Generate arbitrary token + user; call `logout()`; assert `localStorage` empty, context user null, redirected to `/login`

- [ ] 5. Implement routing and route guards
  - [x] 5.1 Create `src/components/ProtectedRoute.tsx`
    - Render children if `user` is non-null; otherwise `<Navigate to="/login" />`
    - _Requirements: 4.1_

  - [x] 5.2 Create `src/components/PublicRoute.tsx`
    - Render children if `user` is null; otherwise `<Navigate to="/tasks" />`
    - _Requirements: 4.2_

  - [x] 5.3 Create `src/App.tsx` with `BrowserRouter` and route definitions
    - Public routes: `/login` → `LoginPage`, `/register` → `RegisterPage`
    - Protected routes: `/tasks` → `TasksPage`, `/users` → `UsersPage`
    - Default redirect `/` → `/login`
    - _Requirements: 4.1, 4.2_

  - [x] 5.4 Write property test for protected routes redirect (Property 8)
    - **Property 8: Protected routes redirect unauthenticated users**
    - **Validates: Requirements 4.1**
    - Use `fc.constantFrom('/tasks', '/users')` to generate protected paths; render without auth; assert redirect to `/login`

- [ ] 6. Implement NavBar component
  - [x] 6.1 Create `src/components/NavBar.tsx`
    - Render nothing when `user` is null
    - When authenticated: show link to `/tasks`, current `user.username`, logout button
    - Show link to `/users` only when `user.is_admin === true`
    - _Requirements: 9.1, 9.2, 9.3, 8.1, 8.7_

  - [x] 6.2 Write property test for NavBar content (Property 19)
    - **Property 19: NavBar displays correct content for authenticated user**
    - **Validates: Requirements 9.1, 9.2, 8.1, 8.7**
    - Use `fc.record({ username: fc.string({ minLength: 1 }), is_admin: fc.boolean(), ... })` to generate User objects; assert admin link present iff `is_admin === true`

- [ ] 7. Implement LoginPage and RegisterPage
  - [x] 7.1 Create `src/pages/LoginPage.tsx`
    - Form with `username` and `password` fields
    - On submit call `AuthContext.login()`; show "Invalid credentials" on 401, generic error otherwise
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

  - [x] 7.2 Create `src/pages/RegisterPage.tsx`
    - On load fetch `GET /companies/` and populate company dropdown; show error if fetch fails
    - Form fields: company (dropdown), email, username, password, first name (optional), last name (optional)
    - On submit POST to `/companies/{company_id}/users`; on success navigate to `/login`; on error display API error message
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 7.3 Write property test for registration payload (Property 1)
    - **Property 1: Form submission sends correct payload**
    - **Validates: Requirements 1.3, 8.4**
    - Generate arbitrary valid form data with `fc.record`; submit form; assert POST body contains exactly the submitted fields

  - [x] 7.4 Write property test for API error display in forms (Property 13)
    - **Property 13: API error messages are displayed in forms**
    - **Validates: Requirements 1.5, 7.4, 8.6**
    - Use `fc.string({ minLength: 1 })` for error message strings; mock API to return error; assert message rendered in form

- [ ] 8. Implement TasksPage with TaskModal
  - [x] 8.1 Create `src/pages/TasksPage.tsx`
    - On load: fetch `GET /companies/{company_id}/tasks` and `GET /companies/{company_id}/users`
    - Render task list showing summary, status, priority, owner username
    - User filter dropdown; on change fetch `GET /companies/{company_id}/tasks?user_id={uid}`
    - "New Task" button opens `TaskModal` in create mode; clicking a task opens it in edit mode
    - Show error + retry on fetch failure; show empty state message when list is empty
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 8.2 Create `TaskModal` component (inline in `TasksPage.tsx` or separate file)
    - Props: `task?: Task`, `users: User[]`, `onClose`, `onSaved`
    - Create mode (no `task`): fields default to `status=todo`, `priority=medium`, `owner_id=currentUser.id`
    - Edit mode: pre-populate all fields from `task`
    - On submit: POST (create) or PATCH with only changed fields (edit); on success call `onSaved`; on error display API error
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 7.1, 7.2, 7.4_

  - [x] 8.3 Write property test for task list rendering (Property 9)
    - **Property 9: Task list displays all returned tasks with required fields**
    - **Validates: Requirements 5.1, 5.2**
    - Use `fc.array(fc.record({ id: fc.integer(), summary: fc.string(), status: fc.constantFrom('todo','in_progress','done'), priority: fc.constantFrom('low','medium','high'), owner_id: fc.integer() }))` to generate task arrays; assert every task appears in rendered list

  - [x] 8.4 Write property test for user filter query param (Property 10)
    - **Property 10: User filter sends correct query parameter**
    - **Validates: Requirements 5.3**
    - Use `fc.integer({ min: 1 })` for user IDs; select filter; assert request URL contains `user_id={uid}`

  - [~] 8.5 Write property test for user list populates dropdowns (Property 11)
    - **Property 11: User lists populate all dropdowns correctly**
    - **Validates: Requirements 5.4, 6.5**
    - Generate user arrays; assert every user appears as option in filter and assignee dropdowns

  - [~] 8.6 Write property test for new task appears in list (Property 12)
    - **Property 12: New task appears in list after creation**
    - **Validates: Requirements 6.3**
    - Generate a Task object; mock POST response; submit create form; assert task appears in list without reload

  - [~] 8.7 Write property test for edit modal pre-population (Property 14)
    - **Property 14: Edit modal pre-populates with current task data**
    - **Validates: Requirements 7.1**
    - Generate arbitrary Task objects; open edit modal; assert each field value matches task properties

  - [~] 8.8 Write property test for PATCH sends only changed fields (Property 15)
    - **Property 15: PATCH request contains only changed fields**
    - **Validates: Requirements 7.2**
    - Generate Task + partial update record; submit edit form; assert PATCH body contains only modified keys

  - [~] 8.9 Write property test for updated task reflected in list (Property 16)
    - **Property 16: Updated task is reflected in the list**
    - **Validates: Requirements 7.3**
    - Generate updated Task; mock PATCH response; submit edit; assert list entry shows updated values

- [ ] 9. Implement UsersPage
  - [x] 9.1 Create `src/pages/UsersPage.tsx`
    - On load fetch `GET /companies/{company_id}/users`; display list with username, email, first name, last name, admin status
    - Inline or modal form to create user: email, username, password, first name (optional), last name (optional)
    - On submit POST to `/companies/{company_id}/users`; on success add user to list; on error display API error
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 9.2 Write property test for user list rendering (Property 17)
    - **Property 17: User list displays all users with required fields**
    - **Validates: Requirements 8.2**
    - Generate user arrays; assert every user appears with all required fields rendered

  - [x] 9.3 Write property test for new user appears in list (Property 18)
    - **Property 18: New user appears in list after creation**
    - **Validates: Requirements 8.5**
    - Generate a User object; mock POST response; submit create form; assert user appears in list without reload

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Add Docker configuration
  - [x] 11.1 Create `frontend/Dockerfile` (multi-stage)
    - Stage 1 (`build`): `node:20-alpine`, `npm ci`, accept `VITE_API_URL` build arg, `npm run build`
    - Stage 2 (`serve`): `nginx:alpine`, copy `/app/dist` to `/usr/share/nginx/html`, copy `nginx.conf`
    - _Requirements: 10.4, 10.5_

  - [x] 11.2 Create `frontend/nginx.conf`
    - Include `try_files $uri /index.html` to support client-side routing
    - _Requirements: 10.1_

  - [x] 11.3 Update `docker-compose.yml` to add `frontend` service
    - Build context `./frontend`, pass `VITE_API_URL: http://localhost:8000` as build arg
    - Expose port `3000:80`, add `depends_on: [api]`
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with minimum 100 iterations (`{ numRuns: 100 }`)
- msw handlers should be set up in a shared `src/test/handlers.ts` file and reused across tests
- The `VITE_API_URL` env var defaults to `http://localhost:8000` in the Dockerfile build arg
