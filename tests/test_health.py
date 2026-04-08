"""
Example-based unit tests for the GET /health endpoint.

The database session is mocked via app.dependency_overrides so no real
PostgreSQL connection is required.
"""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import get_db
from app.core.config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok_db():
    """Mock get_db that executes without error (healthy DB)."""
    db = MagicMock()
    db.execute.return_value = None
    yield db


def _broken_db():
    """Mock get_db that raises on execute (unreachable DB)."""
    db = MagicMock()
    db.execute.side_effect = Exception("connection refused")
    yield db


@pytest.fixture()
def healthy_client():
    app.dependency_overrides[get_db] = _ok_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def degraded_client():
    app.dependency_overrides[get_db] = _broken_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_health_200_when_db_ok(healthy_client):
    """Requirement 1.1, 2.1, 2.2 — HTTP 200 with status=ok and database=ok."""
    response = healthy_client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"


def test_health_503_when_db_unreachable(degraded_client):
    """Requirement 2.3, 2.4 — HTTP 503 with status=degraded and database=unreachable."""
    response = degraded_client.get("/health")
    assert response.status_code == 503
    body = response.json()["detail"]
    assert body["status"] == "degraded"
    assert body["database"] == "unreachable"


def test_health_no_auth_required(healthy_client):
    """Requirement 1.3 — endpoint must not require an Authorization header."""
    response = healthy_client.get("/health")  # no Authorization header
    assert response.status_code not in (401, 403)


def test_health_content_type_json(healthy_client):
    """Requirement 1.4 — response Content-Type must be application/json."""
    response = healthy_client.get("/health")
    assert "application/json" in response.headers["content-type"]


def test_health_route_exists(healthy_client):
    """Requirement 4.1 — route must be registered (not 404)."""
    response = healthy_client.get("/health")
    assert response.status_code != 404


def test_health_app_name_reflects_settings(healthy_client):
    """Requirement 3.1 — app_name in response matches settings.APP_NAME."""
    response = healthy_client.get("/health")
    assert response.json()["app_name"] == settings.APP_NAME


def test_health_environment_reflects_settings(healthy_client):
    """Requirement 3.2 — environment in response matches settings.APP_ENV."""
    response = healthy_client.get("/health")
    assert response.json()["environment"] == settings.APP_ENV
