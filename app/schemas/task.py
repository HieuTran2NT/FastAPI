
from pydantic import BaseModel, Field
from app.models.task import TaskStatus, TaskPriority

class TaskCreate(BaseModel):
    summary: str = Field(min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    owner_id: int | None = None

class TaskUpdate(BaseModel):
    summary: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    owner_id: int | None = None

class TaskRead(BaseModel):
    id: int
    summary: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    company_id: int
    owner_id: int | None

    class Config:
        from_attributes = True
