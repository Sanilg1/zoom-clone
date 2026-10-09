"""Sign up, sign in, sign out."""

from fastapi import APIRouter, Depends, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import bearer, get_current_user
from app.models import User
from app.schemas import AuthResponse, SignInRequest, SignUpRequest, UserOut
from app.services import auth

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def sign_up(body: SignUpRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = auth.sign_up(db, body)
    return AuthResponse(token=auth.create_session(db, user), user=UserOut.model_validate(user))


@router.post("/signin", response_model=AuthResponse)
def sign_in(body: SignInRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = auth.sign_in(db, body)
    return AuthResponse(token=auth.create_session(db, user), user=UserOut.model_validate(user))


@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT)
def sign_out(
    _user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> Response:
    auth.end_session(db, credentials.credentials)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
