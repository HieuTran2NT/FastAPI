
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    first_name: str | None = None
    last_name: str | None = None
    password: str = Field(min_length=6)

class UserRead(BaseModel):
    id: int
    email: EmailStr
    username: str
    first_name: str | None
    last_name: str | None
    is_active: bool
    is_admin: bool
    company_id: int

    class Config:
        from_attributes = True
