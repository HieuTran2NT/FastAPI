from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db
from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return HealthResponse(
            status="ok",
            database="ok",
            app_name=settings.APP_NAME,
            environment=settings.APP_ENV,
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "degraded",
                "database": "unreachable",
                "app_name": settings.APP_NAME,
                "environment": settings.APP_ENV,
            },
        )
