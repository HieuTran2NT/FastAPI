from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    database: str
    app_name: str
    environment: str

    class Config:
        from_attributes = True
