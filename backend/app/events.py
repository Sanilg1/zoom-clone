"""Builders for the JSON messages sent to browsers over the meeting WebSocket."""

from typing import Any

from app.models import ChatMessage, Participant
from app.schemas import ChatMessageOut, ParticipantOut


def participant_json(participant: Participant) -> dict[str, Any]:
    return ParticipantOut.model_validate(participant).model_dump(mode="json")


def participant_joined(participant: Participant) -> dict[str, Any]:
    return {"type": "participant-joined", "participant": participant_json(participant)}


def participant_updated(participant: Participant) -> dict[str, Any]:
    return {"type": "participant-updated", "participant": participant_json(participant)}


def participant_left(participant_id: int) -> dict[str, Any]:
    return {"type": "participant-left", "participant_id": participant_id}


def chat(message: ChatMessage) -> dict[str, Any]:
    return {"type": "chat", "message": ChatMessageOut.model_validate(message).model_dump(mode="json")}


MUTED_BY_HOST = {"type": "muted-by-host"}
REMOVED = {"type": "removed"}
MEETING_ENDED = {"type": "meeting-ended"}
