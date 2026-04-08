# Requirements Document

## Introduction

A React single-page application served via Docker that provides a browser-based UI for the existing FastAPI multi-tenant to-do API. Users can register, log in, and manage tasks scoped to their company. The app is added as a new service in the existing Docker Compose setup and communicates with the backend at `http://localhost:8000`.

## Glossary

- **App**: The React frontend single-page application.
- **API**: The existing FastAPI backend running at `http://localhost:8000`.
- **Auth_Service**: The module responsible for login, logout, and JWT token management within the App.
- **Task_Manager**: The module responsible for displaying, creating, and updating tasks.
- **User_Manager**: The module responsible for displaying and registering users (admin only).
- **Company_Selector**: The UI component that lists available companies during registration and login.
- **JWT**: JSON Web Token returned by `POST /auth/login`, stored client-side and sent as `Authorization: Bearer <token>` on all authenticated requests.
- **Company**: A tenant entity with fields `id`, `name`, `description`, `mode`, `rating`.
- **User**: A member of a company with fields `id`, `email`, `username`, `first_name`, `last_name`, `is_active`, `is_admin`, `company_id`.
- **Task**: A to-do item scoped to a company with fields `id`, `summary`, `description`, `status` (`todo` | `in_progress` | `done`), `priority` (`low` | `medium` | `high`), `company_id`, `owner_id`.
- **Admin**: A User where `is_admin` is `true`; has elevated privileges such as creating additional users.
- **Protected_Route**: A route that requires a valid JWT to access; unauthenticated users are redirected to the login page.

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register an account under a company, so that I can access the to-do application.

#### Acceptance Criteria

1. THE App SHALL display a registration form with fields: company (dropdown), email, username, password, first name (optional), and last name (optional).
2. WHEN the registration page loads, THE Company_Selector SHALL fetch the list of companies from `GET /companies/` and populate the company dropdown.
3. WHEN a user submits the registration form with valid data, THE Auth_Service SHALL send a `POST /companies/{company_id}/users` request with the provided fields.
4. WHEN the registration request succeeds, THE App SHALL redirect the user to the login page.
5. IF the registration request returns an error, THEN THE App SHALL display the error message returned by the API below the form.
6. IF the company dropdown is empty or fails to load, THEN THE App SHALL display an error message indicating companies could not be loaded.

---

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my credentials, so that I can access my company's tasks.

#### Acceptance Criteria

1. THE App SHALL display a login form with fields: username and password.
2. WHEN a user submits the login form, THE Auth_Service SHALL send a `POST /auth/login` request with `username` and `password` as form data (`application/x-www-form-urlencoded`).
3. WHEN the login request succeeds, THE Auth_Service SHALL store the returned `access_token` in browser `localStorage` and redirect the user to the task list page.
4. WHEN the login request succeeds, THE Auth_Service SHALL fetch the current user's profile from `GET /companies/{company_id}/users/me` and store the user object in application state.
5. IF the login request returns a 401 response, THEN THE App SHALL display an "Invalid credentials" message on the login form.
6. IF the login request returns any other error, THEN THE App SHALL display a generic error message on the login form.

---

### Requirement 3: Session Persistence and Logout

**User Story:** As a logged-in user, I want my session to persist across page refreshes and be able to log out, so that I don't have to re-authenticate on every visit.

#### Acceptance Criteria

1. WHEN the App initialises, THE Auth_Service SHALL read the JWT from `localStorage` and restore the authenticated session if a token is present.
2. WHEN a stored JWT is present on initialisation, THE Auth_Service SHALL fetch `GET /companies/{company_id}/users/me` to validate the token and load the current user; if the request fails with a 401, THE Auth_Service SHALL clear the token and redirect to the login page.
3. WHEN a user clicks the logout button, THE Auth_Service SHALL remove the JWT from `localStorage`, clear application state, and redirect the user to the login page.
4. WHILE a user is authenticated, THE App SHALL include the `Authorization: Bearer <token>` header on every API request.

---

### Requirement 4: Protected Routes

**User Story:** As an unauthenticated visitor, I want to be redirected to the login page when accessing protected pages, so that task data remains secure.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to a Protected_Route, THE App SHALL redirect the user to the login page.
2. WHEN an authenticated user navigates to the login or registration page, THE App SHALL redirect the user to the task list page.
3. IF any authenticated API request returns a 401 response, THEN THE Auth_Service SHALL clear the stored JWT and redirect the user to the login page.

---

### Requirement 5: Task List

**User Story:** As a logged-in user, I want to view all tasks in my company, so that I can track work across the team.

#### Acceptance Criteria

1. WHEN the task list page loads, THE Task_Manager SHALL fetch tasks from `GET /companies/{company_id}/tasks` and display them in a list or table.
2. THE Task_Manager SHALL display the following fields for each task: summary, status, priority, and the owner's username.
3. WHEN a user selects a filter by team member, THE Task_Manager SHALL fetch tasks from `GET /companies/{company_id}/tasks?user_id={uid}` and update the displayed list.
4. THE Task_Manager SHALL display a filter control populated with users fetched from `GET /companies/{company_id}/users`.
5. IF the task list request fails, THEN THE Task_Manager SHALL display an error message and a retry option.
6. WHEN the task list is empty, THE Task_Manager SHALL display a message indicating no tasks exist.

---

### Requirement 6: Create Task

**User Story:** As a logged-in user, I want to create a new task, so that I can track work items for my company.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide a form or modal to create a new task with fields: summary (required), description (optional), status (default: `todo`), priority (default: `medium`), and assignee (optional, defaults to current user).
2. WHEN a user submits the create task form with a valid summary, THE Task_Manager SHALL send a `POST /companies/{company_id}/tasks` request.
3. WHEN the create task request succeeds, THE Task_Manager SHALL add the new task to the displayed list without requiring a full page reload.
4. IF the create task request returns a validation error, THEN THE Task_Manager SHALL display the field-level error messages returned by the API.
5. THE Task_Manager SHALL populate the assignee dropdown with users fetched from `GET /companies/{company_id}/users`.

---

### Requirement 7: Edit Task

**User Story:** As a logged-in user, I want to update a task's details, so that I can keep task information current.

#### Acceptance Criteria

1. WHEN a user selects a task to edit, THE Task_Manager SHALL display a form or modal pre-populated with the task's current `summary`, `description`, `status`, `priority`, and `owner_id`.
2. WHEN a user submits the edit form, THE Task_Manager SHALL send a `PATCH /companies/{company_id}/tasks/{task_id}` request with only the changed fields.
3. WHEN the update request succeeds, THE Task_Manager SHALL update the task in the displayed list without requiring a full page reload.
4. IF the update request returns an error, THEN THE Task_Manager SHALL display the error message returned by the API.

---

### Requirement 8: User Management (Admin)

**User Story:** As an admin user, I want to view and create users in my company, so that I can manage team membership.

#### Acceptance Criteria

1. WHILE the current user has `is_admin` equal to `true`, THE App SHALL display a user management section accessible from the navigation.
2. WHEN the user management page loads, THE User_Manager SHALL fetch users from `GET /companies/{company_id}/users` and display them in a list showing: username, email, first name, last name, and admin status.
3. WHILE the current user has `is_admin` equal to `true`, THE User_Manager SHALL provide a form to create a new user with fields: email, username, password, first name (optional), and last name (optional).
4. WHEN an admin submits the create user form with valid data, THE User_Manager SHALL send a `POST /companies/{company_id}/users` request.
5. WHEN the create user request succeeds, THE User_Manager SHALL add the new user to the displayed list without requiring a full page reload.
6. IF the create user request returns an error, THEN THE User_Manager SHALL display the error message returned by the API.
7. WHEN the current user does not have `is_admin` equal to `true`, THE App SHALL not display the user management navigation item.

---

### Requirement 9: Navigation

**User Story:** As a logged-in user, I want a consistent navigation bar, so that I can move between sections of the application easily.

#### Acceptance Criteria

1. WHILE a user is authenticated, THE App SHALL display a navigation bar containing: a link to the task list, the current user's username, and a logout button.
2. WHILE the current user has `is_admin` equal to `true`, THE App SHALL display a link to the user management section in the navigation bar.
3. WHEN a user is not authenticated, THE App SHALL not display the navigation bar.

---

### Requirement 10: Docker Service

**User Story:** As a developer, I want the React app to run as a Docker service, so that the full stack can be started with a single `docker compose up` command.

#### Acceptance Criteria

1. THE App SHALL be served via an Nginx container defined as a new service named `frontend` in the existing `docker-compose.yml`.
2. THE `frontend` service SHALL expose the App on port `3000` of the host machine.
3. THE `frontend` service SHALL depend on the `api` service so that Docker Compose starts services in the correct order.
4. THE App SHALL be built using a multi-stage Dockerfile: a Node.js build stage that produces a static bundle, and an Nginx stage that serves the bundle.
5. THE App SHALL configure the API base URL via a build-time environment variable so that it can be changed without modifying source code.
