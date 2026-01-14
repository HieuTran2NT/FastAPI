
# FastAPI Todos (Docker + PostgreSQL)

A simple multi-company to-dos API built with **FastAPI**, **SQLAlchemy**, **Alembic**, and **PostgreSQL**. Runs via **Docker Compose**.
test

## Features
- Companies created via migration script (seeded sample companies).
- Users belong to a company; first user in a company becomes **admin** (bootstrapping rule).
- Auth with JWT (login using username or email).
- Users in a company can query tasks of **any** users in the same company.

### Tech
- FastAPI + Uvicorn
- SQLAlchemy 2.0 (sync engine)
- Alembic for migrations (manual migration with seeding)
- PostgreSQL storage
- Docker Compose

## Run locally (Docker)
1. Copy `.env.example` to `.env` and adjust secrets if needed.
2. Build and start:
   ```bash
   docker compose up --build
   ```
3. Open Swagger: http://localhost:8000/docs

## API Design

**Auth**
- `POST /auth/login` — returns JWT `access_token` (use in `Authorization: Bearer <token>`)

**Companies**
- `GET /companies/` — list companies

**Users**
- `POST /companies/{company_id}/users` — create a user under company
  - If the company has *no* users, the created user becomes **admin**.
  - Otherwise, only **admin** users in that company can create more users.
- `GET /companies/{company_id}/users/me` — current user info (must belong to company)
- `GET /companies/{company_id}/users` — list users in the company (must belong to company)

**Tasks**
- `POST /companies/{company_id}/tasks` — create task; optional `owner_id` must belong to the same company
- `GET /companies/{company_id}/tasks?user_id={uid}` — list tasks in the company; filter by `owner_id`
- `GET /companies/{company_id}/tasks/{task_id}` — get one task
- `PATCH /companies/{company_id}/tasks/{task_id}` — update task fields

## Request/Response Models
- Pydantic schema models exist in `app/schemas/` with validation.

## Authorization rules
- A user can only access resources within their own `company_id`.
- Creating additional users requires admin rights unless it is the first user in that company.

## Development notes
- Alembic migration creates tables and seeds companies (Contoso, Fabrikam).
- Status: `todo | in_progress | done`; Priority: `low | medium | high`.

## Test with curl
1. Create the first admin for company id `1`:
   ```bash
   curl -X POST http://localhost:8000/companies/1/users      -H 'Content-Type: application/json'      -d '{"email":"admin@contoso.com","username":"admin","password":"secret","first_name":"Admin","last_name":"User"}'
   ```
2. Login:
   ```bash
   curl -X POST http://localhost:8000/auth/login      -H 'Content-Type: application/x-www-form-urlencoded'      -d 'username=admin&password=secret'
   ```
3. Create a task (use token from login):
   ```bash
   TOKEN=... # set the access token
   curl -X POST http://localhost:8000/companies/1/tasks      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json'      -d '{"summary":"Prepare report","priority":"high"}'
   ```
4. Query tasks of another user in same company:
   ```bash
   curl -H "Authorization: Bearer $TOKEN"      'http://localhost:8000/companies/1/tasks?user_id=2'
   ```

## Project structure
```
fastapi-todos/
├─ app/
│  ├─ api/
│  │  ├─ routes/
│  │  │  ├─ auth.py             # login endpoint
│  │  │  ├─ companies.py        # list companies
│  │  │  ├─ users.py            # create/list/me (company-scoped)
│  │  │  └─ tasks.py            # CRUD-ish for tasks (company-scoped)
│  │  ├─ security.py            # OAuth2 deps, auth rules
│  ├─ core/
│  │  ├─ config.py              # env settings
│  │  └─ security.py            # password hashing + JWT helper
│  ├─ db/
│  │  ├─ base.py                # SQLAlchemy Base class
│  │  └─ session.py             # Engine + SessionLocal + get_db dependency
│  ├─ models/
│  │  ├─ company.py             # Company model
│  │  ├─ user.py                # User model (+ FK company)
│  │  └─ task.py                # Task model (+ FK company, owner)
│  ├─ schemas/
│  │  ├─ auth.py                # Token model
│  │  ├─ company.py             # CompanyRead
│  │  ├─ task.py                # TaskCreate/Update/Read
│  │  └─ user.py                # UserCreate/Read
│  └─ __init__.py               # package marker
├─ alembic/
│  ├─ env.py                    # Alembic env config
│  └─ versions/
│     └─ 2025_01_01_...py       # migration: tables + seed companies
├─ scripts/entrypoint.sh         # wait DB, migrate, start server
├─ alembic.ini                   # Alembic config
├─ requirements.txt              # Python deps
├─ docker-compose.yml            # services: db, api
├─ Dockerfile                    # build the API image
├─ .env.example                  # env vars
└─ README.md                     # quick start
```
