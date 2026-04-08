# Implementation Plan: Health Check API

## Overview

Implement a structured `/health` endpoint by creating a dedicated router and Pydantic schema, wiring it into the existing route aggregator, and removing the inline stub from `app/main.py`. The endpoint probes PostgreSQL with `SELECT 1` and returns a structured JSON response with HTTP 200 (healthy) or 503 (degraded).

## Tasks

- [x] 1. Create the `HealthResponse` Pydantic schema
  - Add `app/schemas/health.py` with a `HealthResponse(BaseModel)` containing `status`, `database`, `app_name`, and `environment` string fields
  - _Requirements: 1.2, 1.4, 2.2, 2.3, 3.1, 3.2_

- [x] 2. Implement the health router
  - [x] 2.1 Create `app/api/routes/health.py`
    - Define an `APIRouter` with a single `GET /` route
    - Inject a `Session` via `Depends(get_db)` and execute `db.execute(text("SELECT 1"))` inside `try/except Exception`
    - On success return `HealthResponse(status="ok", database="ok", app_name=settings.APP_NAME, environment=settings.APP_ENV)` with HTTP 200
    - On exception raise `HTTPException(status_code=503)` with a `HealthResponse(status="degraded", database="unreachable", ...)` body
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

  - [x] 2.2 Register the health router in `app/api/routes/__init__.py`
    - Follow the existing pattern: add `health` to the `from . import auth, companies, users, tasks` line, then call `router.include_router(health.router, prefix="/health", tags=["health"])`
    - _Requirements: 4.1, 4.2_

  - [x] 2.3 Remove the inline stub from `app/main.py`
    - Delete the existing `@app.get("/health")` function to avoid route conflicts
    - _Requirements: 4.2_

- [x] 3. Checkpoint — verify routing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Write tests
  - [x] 4.1 Create `tests/test_health.py` with example-based unit tests
    - Create the `tests/` directory with an empty `__init__.py` if it does not exist
    - Use FastAPI `TestClient` with `app.dependency_overrides` to mock `get_db`
    - Cover: HTTP 200 healthy, HTTP 503 degraded, no auth required (no `Authorization` header → not 401/403), `Content-Type: application/json`, route exists (not 404), `app_name` reflects `settings.APP_NAME`, `environment` reflects `settings.APP_ENV`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 2.4, 3.1, 3.2_

  - [ ]* 4.2 Write property-based test for configuration metadata round-trip
    - **Property 1: Configuration metadata round-trip**
    - Use `hypothesis` with `@given(app_name=st.text(min_size=1, max_size=100), app_env=st.text(min_size=1, max_size=50))` and `@settings(max_examples=100)`
    - Override `settings.APP_NAME` and `settings.APP_ENV` with generated values, call the endpoint, assert `response["app_name"] == app_name` and `response["environment"] == app_env`
    - **Validates: Requirements 3.1, 3.2**

- [ ] 5. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- `hypothesis` must be available in the test environment (`pip install hypothesis`)
- The DB probe uses `sqlalchemy.text("SELECT 1")` — import `text` from `sqlalchemy`
- The `HTTPException` 503 body is set via the `detail` parameter as a dict matching `HealthResponse` fields
