"""REST endpoints for creating, listing, joining and moderating meetings."""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app import events
from app.db import get_db
from app.deps import get_current_user, get_optional_user
from app.models import Meeting, User
from app.schemas import (
    HostAction,
    HostedMeetingOut,
    InstantMeetingCreate,
    JoinRequest,
    JoinResponse,
    MeetingOut,
    ParticipantOut,
    ScheduledMeetingCreate,
)
from app.services import meetings as service
from app.services.rooms import rooms

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


# ---------- dashboard (acts as the logged-in default user) ----------


@router.post("/instant", response_model=HostedMeetingOut, status_code=status.HTTP_201_CREATED)
def create_instant(
    body: InstantMeetingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Meeting:
    return service.create_instant_meeting(db, user, body.title)


@router.post("", response_model=HostedMeetingOut, status_code=status.HTTP_201_CREATED)
def create_scheduled(
    body: ScheduledMeetingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Meeting:
    return service.schedule_meeting(db, user, body)


@router.get("/upcoming", response_model=list[HostedMeetingOut])
def upcoming(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[Meeting]:
    return service.list_upcoming(db, user)


@router.get("/recent", response_model=list[MeetingOut])
def recent(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[Meeting]:
    return service.list_recent(db, user)


@router.delete("/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    code: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Response:
    service.delete_meeting(db, service.get_meeting_or_404(db, code), user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- joining (anyone with the meeting ID) ----------


@router.get("/{code}", response_model=MeetingOut)
def read_meeting(code: str, db: Session = Depends(get_db)) -> Meeting:
    return service.get_meeting_or_404(db, code)


@router.post("/{code}/join", response_model=JoinResponse)
def join(
    code: str,
    body: JoinRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> JoinResponse:
    meeting = service.get_meeting_or_404(db, code)
    participant = service.join_meeting(db, meeting, body, user)
    return JoinResponse(
        participant=ParticipantOut.model_validate(participant),
        meeting=MeetingOut.model_validate(meeting),
    )


# ---------- host controls (require the meeting's host key) ----------


@router.post("/{code}/end", status_code=status.HTTP_204_NO_CONTENT)
async def end(code: str, body: HostAction, db: Session = Depends(get_db)) -> Response:
    meeting = service.get_meeting_or_404(db, code)
    service.require_host(meeting, body.host_key)
    service.end_meeting(db, meeting)
    await rooms.broadcast(meeting.code, events.MEETING_ENDED)
    await rooms.close_room(meeting.code)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{code}/mute-all", status_code=status.HTTP_204_NO_CONTENT)
async def mute_all(code: str, body: HostAction, db: Session = Depends(get_db)) -> Response:
    meeting = service.get_meeting_or_404(db, code)
    service.require_host(meeting, body.host_key)
    for participant in service.mute_all(db, meeting):
        await rooms.send(meeting.code, participant.id, events.MUTED_BY_HOST)
        await rooms.broadcast(meeting.code, events.participant_updated(participant))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{code}/participants/{participant_id}/mute", status_code=status.HTTP_204_NO_CONTENT)
async def mute_one(
    code: str, participant_id: int, body: HostAction, db: Session = Depends(get_db)
) -> Response:
    meeting = service.get_meeting_or_404(db, code)
    service.require_host(meeting, body.host_key)
    participant = service.mute_participant(db, service.get_participant_or_404(meeting, participant_id))
    await rooms.send(meeting.code, participant.id, events.MUTED_BY_HOST)
    await rooms.broadcast(meeting.code, events.participant_updated(participant))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{code}/participants/{participant_id}/make-host", status_code=status.HTTP_204_NO_CONTENT)
async def make_host(
    code: str, participant_id: int, body: HostAction, db: Session = Depends(get_db)
) -> Response:
    meeting = service.get_meeting_or_404(db, code)
    service.require_host(meeting, body.host_key)
    participant = service.get_participant_or_404(meeting, participant_id)
    changed, new_key = service.make_host(db, meeting, participant)
    await rooms.send(meeting.code, participant.id, events.host_granted(new_key))
    for person in changed:
        await rooms.broadcast(meeting.code, events.participant_updated(person))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{code}/participants/{participant_id}/remove", status_code=status.HTTP_204_NO_CONTENT)
async def remove(
    code: str, participant_id: int, body: HostAction, db: Session = Depends(get_db)
) -> Response:
    meeting = service.get_meeting_or_404(db, code)
    service.require_host(meeting, body.host_key)
    participant = service.get_participant_or_404(meeting, participant_id)
    service.remove_participant(db, participant)
    await rooms.send(meeting.code, participant.id, events.REMOVED)
    await rooms.close(meeting.code, participant.id)
    await rooms.broadcast(meeting.code, events.participant_left(participant.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
