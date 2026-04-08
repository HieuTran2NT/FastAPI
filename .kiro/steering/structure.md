# Project Structure

```
app/
├── main.py              # FastAPI app init, middleware, router registration
├── api/
│   ├── security.py      # Auth dependencies: get_current_user, require_company_member, require_admin
│   └── routes/
│       ├── __init__.py  # Aggregates all routers
│       ├── auth.py      # POST /auth/login
│       ├── companies.py # GET /companies/
│       ├── users.py     # User CRUD under /companies/{company_id}/users
│       └── tasks.py     # Task CRUD under /companies/{company_id}/tasks
├── core/
│   ├── config.py        # Settings (pydantic BaseModel, reads from env)
│   └── security.py      # JWT creation, password hashing/verification
├── db/
│   ├── base.py          # SQLAlchemy declarative Base
│   └── session.py       # Engine, SessionLocal, get_db dependency
├── models/
│   ├── __init__.py      # Re-exports all models (required for Alembic autogenerate)
│   ├── company.py       # Company model
│   ├── user.py          # User model (FK → company)
│   └── task.py          # Task model (FK → company, FK → user); TaskStatus/TaskPriority enums
└── schemas/
    ├── auth.py          # Token response schema
    ├── company.py       # CompanyRead
    ├── user.py          # UserCreate, UserRead
    └── task.py          # TaskCreate, TaskUpdate, TaskRead

alembic/
├── env.py               # Alembic config (imports Base + all models)
└── versions/            # Migration files (naming: YYYY_MM_DD_NNNNNN_description.py)

scripts/
└── entrypoint.sh        # Docker entrypoint: wait-for-db → alembic upgrade head → uvicorn
```

## Conventions

- Routes are grouped by resource and nested under `/companies/{company_id}/` to enforce company scoping.
- Auth dependencies are composed via FastAPI `Depends`: `get_current_user` → `require_company_member` → `require_admin`.
- SQLAlchemy models use the SQLAlchemy 2.0 `Mapped` / `mapped_column` typed style.
- Pydantic schemas use `from_attributes = True` on `Read` models for ORM compatibility.
- Enums shared between models and schemas are defined in the model file and imported into schemas.
- All new models must be imported in `app/models/__init__.py` so Alembic can detect them.
- Configuration is accessed via the `settings` singleton from `app/core/config.py`.
- Database sessions are injected via `Depends(get_db)` — never instantiated directly in route handlers.
