
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models import Company
from app.schemas.company import CompanyRead
from typing import List

router = APIRouter()

@router.get("/", response_model=List[CompanyRead])
def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).order_by(Company.id).all()
