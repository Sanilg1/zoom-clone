"""Shared FastAPI dependencies."""

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User

DEFAULT_USER_EMAIL = "sanil@zoomclone.dev"


def get_current_user(db: Session = Depends(get_db)) -> User:
    """No login in this app: every request acts as the seeded default user."""
    user = db.scalar(select(User).where(User.email == DEFAULT_USER_EMAIL))
    if user is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Default user is missing; run the seed")
    return user
