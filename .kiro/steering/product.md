# Product

A multi-tenant to-do API where users belong to companies and manage tasks scoped to their company.

## Core Concepts

- **Companies** are seeded via migration (Contoso, Fabrikam). They cannot be created via API.
- **Users** belong to exactly one company. The first user registered in a company automatically becomes admin.
- **Tasks** are company-scoped and can be assigned to any user within the same company.

## Authorization Model

- All resource access is scoped to the authenticated user's `company_id` — cross-company access is forbidden.
- Admin rights are required to create additional users in a company (after the first user).
- Any company member can read tasks belonging to other members of the same company.

## API Surface

- `POST /auth/login` — JWT login (username or email)
- `GET /companies/` — list companies
- `POST /companies/{company_id}/users` — register user (first = admin, subsequent = admin-only)
- `GET /companies/{company_id}/users` — list company users
- `GET /companies/{company_id}/users/me` — current user info
- `POST /companies/{company_id}/tasks` — create task
- `GET /companies/{company_id}/tasks` — list tasks (filterable by `user_id`)
- `GET /companies/{company_id}/tasks/{task_id}` — get task
- `PATCH /companies/{company_id}/tasks/{task_id}` — update task
