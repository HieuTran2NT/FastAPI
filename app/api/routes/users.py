
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models import User, Company
from app.schemas.user import UserCreate, UserRead
from app.core.security import get_password_hash
from app.api.security import get_current_user, require_company_member, require_admin
import jwt
from app.core.config import settings

router = APIRouter()

# Optional bearer — returns None instead of raising 401 when no token provided
_optional_bearer = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def _get_optional_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(_optional_bearer),
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        return user if user and user.is_active else None
    except Exception:
        return None

@router.post("/", response_model=UserRead)
def create_user(
    company_id: int,
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    user_count = db.query(User).filter(User.company_id == company_id).count()
    if user_count > 0:
        # Subsequent users require an authenticated admin
        if current_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        if not current_user.is_admin:
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
