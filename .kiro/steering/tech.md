# Tech Stack

## Language & Runtime
- Python 3.11+
- FastAPI 0.115 + Uvicorn (ASGI server)

## Database
- PostgreSQL 16 (via Docker)
- SQLAlchemy 2.0 (sync engine, `mapped_column` / `Mapped` typed ORM style)
- Alembic 1.14 for migrations

## Auth & Security
- PyJWT 2.9 — HS256 JWT tokens
- passlib[bcrypt] — password hashing
- OAuth2PasswordBearer for token extraction

## Validation
- Pydantic 2.9 — request/response schemas
- email-validator for email fields
- python-multipart for form data (login endpoint)

## Configuration
- python-dotenv — env vars loaded from `.env`
- Settings defined as a `pydantic.BaseModel` in `app/core/config.py`

## Infrastructure
- Docker + Docker Compose (services: `db`, `api`)
- `scripts/entrypoint.sh` — waits for DB, runs migrations, starts Uvicorn

## Common Commands

```bash
# Start everything (builds image, runs migrations, starts API)
docker compose up --build

# Run migrations only
docker compose run --rm api alembic upgrade head

# Access API docs
open http://localhost:8000/docs

# Tail API logs
docker compose logs -f api
```
