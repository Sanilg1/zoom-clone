"""Shared FastAPI dependencies: who is making the request."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.services import auth

# Reads "Authorization: Bearer <token>"; auto_error=False lets us return our own 401 message.
bearer = HTTPBearer(auto_error=False)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User | None:
    """The signed-in user, or None for guests (used where signing in is optional)."""
    if credentials is None:
        return None
    return auth.user_for_token(db, credentials.credentials)


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    """The signed-in user; responds 401 if the request has no valid session token."""
    if user is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Please sign in",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
