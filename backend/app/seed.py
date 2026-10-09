"""Sample data so the dashboard is not empty on first run.

Runs automatically at startup when the users table is empty. To reset: delete zoom_clone.db and restart,
or run `python -m app.seed --reset`.
"""

import secrets
import sys
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine, utcnow
from app.deps import DEFAULT_USER_EMAIL
from app.models import (
    ChatMessage,
    Meeting,
    MeetingStatus,
    MeetingType,
    Participant,
    ParticipantRole,
    User,
)
from app.services.meetings import generate_unique_code

USERS = [
    ("Sanil", DEFAULT_USER_EMAIL, "#0E71EB"),  # the logged-in default user
    ("Aarav Mehta", "aarav@zoomclone.dev", "#E8590C"),
    ("Priya Sharma", "priya@zoomclone.dev", "#2F9E44"),
    ("Rohan Verma", "rohan@zoomclone.dev", "#9C36B5"),
    ("Neha Kapoor", "neha@zoomclone.dev", "#C2255C"),
]

SEED_TIMEZONE = ZoneInfo("Asia/Kolkata")  # the default user's time zone

# (title, description, days from today, local start time or None for "in about an hour", duration in minutes)
UPCOMING = [
    ("Daily Standup", "Yesterday / today / blockers.", 0, None, 15),
    ("Sprint Planning", "Plan sprint 14 and size the backlog.", 1, time(10, 0), 60),
    ("Design Review: Meeting Room UI", "Walk through the new gallery view and toolbar.", 2, time(15, 0), 45),
    ("1:1 with Priya", "", 3, time(11, 30), 30),
]

# (title, ended hours ago, duration in minutes, attendee indexes into USERS, chat lines)
PAST = [
    ("Product Sync", 3, 40, [1, 2], [(1, "Shared the roadmap doc in the channel"), (0, "Thanks!")]),
    ("Backend API Walkthrough", 20, 55, [3], [(3, "Can you share the schema diagram?")]),
    ("Team Retro", 46, 60, [1, 2, 3, 4], []),
    ("Interview Prep", 70, 30, [4], [(4, "Good luck tomorrow!")]),
    ("Sanil's Zoom Meeting", 96, 20, [2], []),
]


def _upcoming_start(now: datetime, days: int, at: time | None) -> datetime:
    if at is None:
        # Next full hour after the next 30 minutes, so there is always a meeting coming up soon.
        return (now + timedelta(minutes=90)).replace(minute=0, second=0, microsecond=0)
    local_day = now.astimezone(SEED_TIMEZONE).date() + timedelta(days=days)
    return datetime.combine(local_day, at, tzinfo=SEED_TIMEZONE)


def seed(db: Session) -> None:
    now = utcnow()
    users = [User(name=name, email=email, avatar_color=color) for name, email, color in USERS]
    db.add_all(users)
    me = users[0]

    for title, description, days, at, minutes in UPCOMING:
        db.add(
            Meeting(
                code=generate_unique_code(db),
                host_key=secrets.token_urlsafe(24),
                title=title,
                description=description,
                host=me,
                meeting_type=MeetingType.SCHEDULED,
                start_time=_upcoming_start(now, days, at),
                duration_minutes=minutes,
            )
        )
        db.flush()

    for title, ended_hours_ago, minutes, attendee_indexes, chat_lines in PAST:
        ended_at = now - timedelta(hours=ended_hours_ago)
        started_at = ended_at - timedelta(minutes=minutes)
        meeting = Meeting(
            code=generate_unique_code(db),
            host_key=secrets.token_urlsafe(24),
            title=title,
            host=me,
            meeting_type=MeetingType.INSTANT,
            status=MeetingStatus.ENDED,
            start_time=started_at,
            duration_minutes=minutes,
            created_at=started_at,
            started_at=started_at,
            ended_at=ended_at,
        )
        db.add(meeting)
        db.flush()

        people = [me] + [users[i] for i in attendee_indexes]
        participants = [
            Participant(
                meeting=meeting,
                user=person,
                display_name=person.name,
                role=ParticipantRole.HOST if person is me else ParticipantRole.ATTENDEE,
                joined_at=started_at + timedelta(minutes=offset),
                left_at=ended_at,
            )
            for offset, person in enumerate(people)
        ]
        db.add_all(participants)
        db.flush()

        for minute, (sender_index, body) in enumerate(chat_lines, start=5):
            sender = participants[0] if sender_index == 0 else next(
                p for p in participants if p.user is users[sender_index]
            )
            db.add(
                ChatMessage(
                    meeting=meeting,
                    sender=sender,
                    body=body,
                    sent_at=started_at + timedelta(minutes=minute),
                )
            )

    db.commit()


def seed_if_empty(db: Session) -> None:
    if db.scalar(select(func.count(User.id))) == 0:
        seed(db)


if __name__ == "__main__":
    if "--reset" in sys.argv:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        seed_if_empty(session)
    print("Database ready.")
