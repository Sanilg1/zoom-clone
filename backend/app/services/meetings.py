"""Business rules for meetings and participants. Routers stay thin and call these."""

import secrets
from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import utcnow
from app.models import (
    ChatMessage,
    Meeting,
    MeetingStatus,
    MeetingType,
    Participant,
    ParticipantRole,
    User,
)
from app.schemas import JoinRequest, ScheduledMeetingCreate

MAX_CHAT_LENGTH = 2000


# ---------- lookups ----------


def normalize_code(raw: str) -> str:
    """Accepts "845 1234 5678", "845-1234-5678" or "84512345678"."""
    return "".join(ch for ch in raw if ch.isdigit())


def get_meeting_or_404(db: Session, code: str) -> Meeting:
    meeting = db.scalar(select(Meeting).where(Meeting.code == normalize_code(code)))
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This meeting ID is not valid")
    return meeting


def get_participant_or_404(meeting: Meeting, participant_id: int) -> Participant:
    for participant in meeting.participants:
        if participant.id == participant_id:
            return participant
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Participant not found")


def require_host(meeting: Meeting, host_key: str) -> None:
    if not secrets.compare_digest(host_key, meeting.host_key):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the host can do this")


def active_participants(meeting: Meeting) -> list[Participant]:
    return [p for p in meeting.participants if p.is_active]


# ---------- creating meetings ----------


def generate_unique_code(db: Session) -> str:
    while True:
        # 11 digits without a leading zero, like Zoom's meeting IDs.
        code = str(10**10 + secrets.randbelow(9 * 10**10))
        if db.scalar(select(Meeting.id).where(Meeting.code == code)) is None:
            return code


def _new_meeting(db: Session, host: User, **fields) -> Meeting:
    meeting = Meeting(
        code=generate_unique_code(db),
        host_key=secrets.token_urlsafe(24),
        host=host,
        **fields,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def create_instant_meeting(db: Session, host: User, title: str | None) -> Meeting:
    return _new_meeting(
        db,
        host,
        title=(title or "").strip() or f"{host.name}'s Zoom Meeting",
        meeting_type=MeetingType.INSTANT,
        start_time=utcnow(),
        duration_minutes=60,
    )


def schedule_meeting(db: Session, host: User, data: ScheduledMeetingCreate) -> Meeting:
    # Small grace period so a meeting set for "now" in the picker is still accepted.
    if data.start_time < utcnow() - timedelta(minutes=5):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Start time must be in the future")
    return _new_meeting(
        db,
        host,
        title=data.title,
        description=data.description.strip(),
        meeting_type=MeetingType.SCHEDULED,
        start_time=data.start_time,
        duration_minutes=data.duration_minutes,
    )


def delete_meeting(db: Session, meeting: Meeting, user: User) -> None:
    if meeting.host_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the host can delete this meeting")
    if meeting.status == MeetingStatus.LIVE:
        raise HTTPException(status.HTTP_409_CONFLICT, "End the meeting before deleting it")
    db.delete(meeting)
    db.commit()


# ---------- dashboard lists ----------


def list_upcoming(db: Session, user: User) -> list[Meeting]:
    """Scheduled meetings the user hosts that have not finished yet, soonest first."""
    candidates = db.scalars(
        select(Meeting)
        .where(
            Meeting.host_id == user.id,
            Meeting.meeting_type == MeetingType.SCHEDULED,
            Meeting.status != MeetingStatus.ENDED,
        )
        .order_by(Meeting.start_time)
    ).all()
    now = utcnow()
    return [m for m in candidates if m.end_time > now or m.status == MeetingStatus.LIVE]


def list_recent(db: Session, user: User, limit: int = 10) -> list[Meeting]:
    """Ended meetings the user hosted or attended, most recent first."""
    return list(
        db.scalars(
            select(Meeting)
            .where(
                Meeting.status == MeetingStatus.ENDED,
                (Meeting.host_id == user.id) | Meeting.participants.any(Participant.user_id == user.id),
            )
            .order_by(Meeting.ended_at.desc())
            .limit(limit)
        ).all()
    )


# ---------- joining and leaving ----------


def join_meeting(db: Session, meeting: Meeting, data: JoinRequest) -> Participant:
    is_host = data.host_key is not None and secrets.compare_digest(data.host_key, meeting.host_key)
    participant = Participant(
        meeting=meeting,
        user_id=meeting.host_id if is_host else None,
        display_name=data.display_name,
        role=ParticipantRole.HOST if is_host else ParticipantRole.ATTENDEE,
        is_muted=data.is_muted,
        is_video_on=data.is_video_on,
    )
    if meeting.status != MeetingStatus.LIVE:
        meeting.status = MeetingStatus.LIVE
        meeting.started_at = meeting.started_at or utcnow()
        meeting.ended_at = None
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def leave_meeting(db: Session, participant: Participant) -> None:
    """Marks the participant as gone; ends the meeting when the last person leaves."""
    now = utcnow()
    if participant.left_at is None:
        participant.left_at = now
    meeting = participant.meeting
    if meeting.status == MeetingStatus.LIVE and not active_participants(meeting):
        meeting.status = MeetingStatus.ENDED
        meeting.ended_at = now
    db.commit()


def end_meeting(db: Session, meeting: Meeting) -> None:
    now = utcnow()
    for participant in active_participants(meeting):
        participant.left_at = now
    meeting.status = MeetingStatus.ENDED
    meeting.ended_at = now
    db.commit()


# ---------- in-meeting state ----------


def update_media_state(
    db: Session, participant: Participant, is_muted: bool, is_video_on: bool, is_sharing_screen: bool
) -> Participant:
    participant.is_muted = is_muted
    participant.is_video_on = is_video_on
    participant.is_sharing_screen = is_sharing_screen
    db.commit()
    return participant


def mute_participant(db: Session, participant: Participant) -> Participant:
    participant.is_muted = True
    db.commit()
    return participant


def mute_all(db: Session, meeting: Meeting) -> list[Participant]:
    """Mutes everyone except hosts; returns the participants that changed."""
    changed = [
        p
        for p in active_participants(meeting)
        if p.role != ParticipantRole.HOST and not p.is_muted
    ]
    for participant in changed:
        participant.is_muted = True
    db.commit()
    return changed


def remove_participant(db: Session, participant: Participant) -> None:
    if participant.role == ParticipantRole.HOST:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The host cannot be removed")
    participant.is_removed = True
    participant.left_at = participant.left_at or utcnow()
    db.commit()


def add_chat_message(db: Session, participant: Participant, body: str) -> ChatMessage | None:
    body = body.strip()[:MAX_CHAT_LENGTH]
    if not body:
        return None
    message = ChatMessage(meeting_id=participant.meeting_id, sender=participant, body=body)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
