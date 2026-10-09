"""The meeting WebSocket: presence, WebRTC signalling, media state, chat and reactions.

Messages from the browser:
  {"type": "signal", "to": <participant id>, "data": {sdp | candidate}}  relayed to one peer
  {"type": "media-state", "is_muted": bool, "is_video_on": bool,
   "is_sharing_screen": bool}                                            saved and broadcast
  {"type": "chat", "body": str}                                          saved and broadcast
  {"type": "reaction", "emoji": str}                                     broadcast only
"""

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app import events
from app.db import SessionLocal
from app.models import Participant
from app.services import meetings as service
from app.services.rooms import rooms

router = APIRouter()

ALLOWED_REACTIONS = {"👍", "👏", "❤️", "😂", "😮", "🎉"}
CLOSE_NOT_ALLOWED = 4403


@router.websocket("/ws/meetings/{code}")
async def meeting_socket(websocket: WebSocket, code: str, participant_id: int) -> None:
    with SessionLocal() as db:
        participant = db.get(Participant, participant_id)
        if participant is None or participant.meeting.code != code or not participant.is_active:
            await websocket.close(code=CLOSE_NOT_ALLOWED)
            return
        already_here = [
            events.participant_json(p)
            for p in service.active_participants(participant.meeting)
            if p.id in rooms.connected_ids(code)
        ]
        joined_message = events.participant_joined(participant)

    await websocket.accept()
    rooms.connect(code, participant_id, websocket)
    # The newcomer gets everyone already connected and will send each of them a WebRTC offer.
    await websocket.send_json({"type": "room-state", "participants": already_here})
    await rooms.broadcast(code, joined_message, exclude=participant_id)

    try:
        while True:
            try:
                message = json.loads(await websocket.receive_text())
            except json.JSONDecodeError:
                continue
            if isinstance(message, dict):
                await _handle_message(code, participant_id, message)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        rooms.disconnect(code, participant_id, websocket)
        with SessionLocal() as db:
            participant = db.get(Participant, participant_id)
            if participant is not None:
                service.leave_meeting(db, participant)
        await rooms.broadcast(code, events.participant_left(participant_id))


async def _handle_message(code: str, sender_id: int, message: dict[str, Any]) -> None:
    kind = message.get("type")

    if kind == "signal":
        # WebRTC offer/answer/ICE candidate: the server only forwards it.
        target = message.get("to")
        if isinstance(target, int):
            await rooms.send(code, target, {"type": "signal", "from": sender_id, "data": message.get("data")})
    elif kind == "reaction":
        if message.get("emoji") in ALLOWED_REACTIONS:
            await rooms.broadcast(
                code, {"type": "reaction", "participant_id": sender_id, "emoji": message["emoji"]}
            )
    elif kind in ("media-state", "chat"):
        with SessionLocal() as db:
            participant = _active_participant(db, sender_id)
            if participant is None:
                return
            if kind == "media-state":
                service.update_media_state(
                    db,
                    participant,
                    is_muted=bool(message.get("is_muted")),
                    is_video_on=bool(message.get("is_video_on")),
                    is_sharing_screen=bool(message.get("is_sharing_screen")),
                )
                await rooms.broadcast(code, events.participant_updated(participant))
            else:
                chat_message = service.add_chat_message(db, participant, str(message.get("body", "")))
                if chat_message is not None:
                    await rooms.broadcast(code, events.chat(chat_message))


def _active_participant(db: Session, participant_id: int) -> Participant | None:
    participant = db.get(Participant, participant_id)
    return participant if participant is not None and participant.is_active else None
