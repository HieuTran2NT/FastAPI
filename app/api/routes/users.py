
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models import User, Company
from app.schemas.user import UserCreate, UserRead
from app.core.security import get_password_hash
from app.api.security import get_current_user, require_company_member, require_admin

router = APIRouter()

@router.post("/", response_model=UserRead)
def create_user(company_id: int, payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Bootstrapping rule: if company has no users, allow public creation and mark as admin.
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    user_count = db.query(User).filter(User.company_id == company_id).count()
    if user_count > 0 and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required to add users")
    is_admin = (user_count == 0)
    if db.query(User).filter((User.email == payload.email) | (User.username == payload.username)).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or username already exists")
    user = User(
        email=payload.email,
        username=payload.username,
        first_name=payload.first_name,
        last_name=payload.last_name,
        hashed_password=get_password_hash(payload.password),
        is_active=True,
        is_admin=is_admin,
        company_id=company_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=UserRead)
def me(company_id: int, current_user: User = Depends(require_company_member), db: Session = Depends(get_db)):
    return current_user

@router.get("/", response_model=List[UserRead])
def list_users(company_id: int, current_user: User = Depends(require_company_member), db: Session = Depends(get_db)):
    return db.query(User).filter(User.company_id == company_id).order_by(User.id).all()
