
from pydantic import BaseModel, Field

class CompanyBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    mode: str | None = None
    rating: int | None = None

class CompanyRead(CompanyBase):
    id: int

    class Config:
        from_attributes = True
