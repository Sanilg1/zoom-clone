"""Request and response bodies for the REST API."""

import re
from datetime import datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, computed_field, field_validator

from app.config import FRONTEND_URL
from app.models import MeetingStatus, MeetingType, ParticipantRole


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- users ----------


class UserOut(ORMModel):
    id: int
    name: str
    email: str
    avatar_color: str
    timezone: str


# ---------- auth ----------

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalise_email(value: str) -> str:
    value = value.strip().lower()
    if not EMAIL_PATTERN.match(value):
        raise ValueError("Enter a valid email address")
    return value


class SignInRequest(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def check_email(cls, value: str) -> str:
        return _normalise_email(value)


class SignUpRequest(SignInRequest):
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class AuthResponse(BaseModel):
    token: str
    user: UserOut


# ---------- meetings ----------


class MeetingOut(ORMModel):
    code: str
    title: str
    description: str
    meeting_type: MeetingType
    status: MeetingStatus
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    created_at: datetime
    started_at: datetime | None
    ended_at: datetime | None
    host: UserOut
    participant_count: int

    @computed_field
    @property
    def invite_url(self) -> str:
        return f"{FRONTEND_URL}/j/{self.code}"


class HostedMeetingOut(MeetingOut):
    """Returned only to the meeting's creator; includes the key that grants host rights."""

    host_key: str


class InstantMeetingCreate(BaseModel):
    title: str | None = Field(default=None, max_length=200)


class ScheduledMeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    start_time: AwareDatetime
    duration_minutes: int = Field(default=60, ge=15, le=24 * 60)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank")
        return value


# ---------- participants ----------


class ParticipantOut(ORMModel):
    id: int
    display_name: str
    role: ParticipantRole
    is_muted: bool
    is_video_on: bool
    is_sharing_screen: bool
    joined_at: datetime


class JoinRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    host_key: str | None = None
    is_muted: bool = False
    is_video_on: bool = True

    @field_validator("display_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class JoinResponse(BaseModel):
    participant: ParticipantOut
    meeting: MeetingOut


class HostAction(BaseModel):
    """Body for actions only the host may perform."""

    host_key: str


# ---------- chat ----------


class ChatMessageOut(ORMModel):
    id: int
    participant_id: int
    sender_name: str
    body: str
    sent_at: datetime
