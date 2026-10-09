"""SQLAlchemy models.

users 1 ── * sessions          (one row per signed-in device)
users 1 ── * meetings          (a user hosts many meetings)
meetings 1 ── * participants   (one row per person per time they join)
users 1 ── * participants      (optional: guests have no user row)
meetings 1 ── * chat_messages
participants 1 ── * chat_messages
"""

import enum
from datetime import datetime, timedelta

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, UTCDateTime, utcnow


class MeetingType(str, enum.Enum):
    INSTANT = "instant"
    SCHEDULED = "scheduled"


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"  # created, nobody has joined yet
    LIVE = "live"  # at least one participant has joined
    ENDED = "ended"  # host ended it or everyone left


class ParticipantRole(str, enum.Enum):
    HOST = "host"
    ATTENDEE = "attendee"


def _enum(enum_cls: type[enum.Enum]) -> Enum:
    # Store the lowercase values ("live"), not the member names ("LIVE").
    return Enum(enum_cls, values_callable=lambda e: [m.value for m in e], native_enum=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    # scrypt hash ("scrypt$salt$hash"); null for seeded sample attendees, who cannot sign in.
    password_hash: Mapped[str | None] = mapped_column(String(255))
    avatar_color: Mapped[str] = mapped_column(String(7), default="#0E71EB")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    hosted_meetings: Mapped[list["Meeting"]] = relationship(back_populates="host")
    sessions: Mapped[list["AuthSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class AuthSession(Base):
    """A signed-in browser. The token itself is never stored, only its SHA-256 hash."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime)

    user: Mapped[User] = relationship(back_populates="sessions")


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # 11-digit public meeting ID, e.g. "84512345678" (shown as "845 1234 5678").
    code: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    # Secret given only to the creator; whoever presents it when joining becomes host.
    host_key: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    meeting_type: Mapped[MeetingType] = mapped_column(_enum(MeetingType))
    status: Mapped[MeetingStatus] = mapped_column(
        _enum(MeetingStatus), default=MeetingStatus.SCHEDULED
    )
    start_time: Mapped[datetime] = mapped_column(UTCDateTime, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    ended_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    host: Mapped[User] = relationship(back_populates="hosted_meetings")
    participants: Mapped[list["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Participant.joined_at"
    )
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="ChatMessage.sent_at"
    )

    @property
    def end_time(self) -> datetime:
        return self.start_time + timedelta(minutes=self.duration_minutes)

    @property
    def participant_count(self) -> int:
        """Distinct people who have ever joined (rejoining after a refresh counts once)."""
        return len({p.user_id or p.display_name for p in self.participants})


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        # Fast lookup of who is currently in a meeting (left_at IS NULL).
        Index("ix_participants_meeting_active", "meeting_id", "left_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[ParticipantRole] = mapped_column(
        _enum(ParticipantRole), default=ParticipantRole.ATTENDEE
    )
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_video_on: Mapped[bool] = mapped_column(Boolean, default=True)
    is_sharing_screen: Mapped[bool] = mapped_column(Boolean, default=False)
    is_removed: Mapped[bool] = mapped_column(Boolean, default=False)
    joined_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    left_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    meeting: Mapped[Meeting] = relationship(back_populates="participants")
    user: Mapped[User | None] = relationship()

    @property
    def is_active(self) -> bool:
        return self.left_at is None and not self.is_removed


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("participants.id", ondelete="CASCADE")
    )
    body: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    meeting: Mapped[Meeting] = relationship(back_populates="messages")
    sender: Mapped[Participant] = relationship()

    @property
    def sender_name(self) -> str:
        return self.sender.display_name
