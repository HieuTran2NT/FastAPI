
from fastapi import APIRouter
from . import auth, companies, users, tasks

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(companies.router, prefix="/companies", tags=["companies"])
router.include_router(users.router, prefix="/companies/{company_id}/users", tags=["users"])
router.include_router(tasks.router, prefix="/companies/{company_id}/tasks", tags=["tasks"])
