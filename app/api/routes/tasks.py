
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models import Task, User
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.api.security import require_company_member, get_current_user

router = APIRouter()

@router.post("/", response_model=TaskRead)
def create_task(company_id: int, payload: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(require_company_member)):
    if payload.owner_id is not None:
        owner = db.query(User).filter(User.id == payload.owner_id, User.company_id == company_id).first()
        if not owner:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="owner_id must belong to the same company")
    task = Task(
        summary=payload.summary,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        company_id=company_id,
        owner_id=payload.owner_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/", response_model=List[TaskRead])
def list_tasks(company_id: int, user_id: Optional[int] = Query(default=None), db: Session = Depends(get_db), current_user: User = Depends(require_company_member)):
    q = db.query(Task).filter(Task.company_id == company_id)
    if user_id is not None:
        # user can query tasks of another user in the same company
        q = q.filter(Task.owner_id == user_id)
    return q.order_by(Task.id).all()

@router.get("/{task_id}", response_model=TaskRead)
def get_task(company_id: int, task_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_company_member)):
    task = db.query(Task).filter(Task.company_id == company_id, Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task

@router.patch("/{task_id}", response_model=TaskRead)
def update_task(company_id: int, task_id: int, payload: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_company_member)):
    task = db.query(Task).filter(Task.company_id == company_id, Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task
