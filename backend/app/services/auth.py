"""Sign-up, sign-in and session tokens.

Passwords are hashed with scrypt (salted, deliberately slow) from Python's standard library.
A sign-in creates a random session token; the database keeps only its SHA-256 hash, so a leaked
database does not contain usable tokens.
"""

import hashlib
import secrets
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import SESSION_DAYS
from app.db import utcnow
from app.models import AuthSession, User
from app.schemas import SignInRequest, SignUpRequest

AVATAR_COLORS = ["#0E71EB", "#E8590C", "#2F9E44", "#9C36B5", "#C2255C", "#1098AD", "#F08C00"]

# scrypt cost parameters: 16 MB of memory per hash, ~50 ms on a laptop.
_SCRYPT = {"n": 2**14, "r": 8, "p": 1}


# ---------- passwords ----------


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), **_SCRYPT)
    return secrets.compare_digest(digest.hex(), digest_hex)


# Used when the email is unknown, so a wrong email takes as long as a wrong password
# (otherwise response time would reveal which emails have accounts).
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


# ---------- sessions ----------


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(user=user, token_hash=_hash_token(token), expires_at=utcnow() + timedelta(days=SESSION_DAYS)))
    db.commit()
    return token


def user_for_token(db: Session, token: str) -> User | None:
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == _hash_token(token)))
    if session is None or session.expires_at <= utcnow():
        return None
    return session.user


def end_session(db: Session, token: str) -> None:
    db.execute(delete(AuthSession).where(AuthSession.token_hash == _hash_token(token)))
    db.commit()


# ---------- accounts ----------


def sign_up(db: Session, data: SignUpRequest) -> User:
    if db.scalar(select(User.id).where(User.email == data.email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        avatar_color=secrets.choice(AVATAR_COLORS),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def sign_in(db: Session, data: SignInRequest) -> User:
    user = db.scalar(select(User).where(User.email == data.email))
    stored = user.password_hash if user and user.password_hash else _DUMMY_HASH
    if not verify_password(data.password, stored) or user is None or user.password_hash is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return user
