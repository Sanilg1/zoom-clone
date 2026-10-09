"""Keeps track of the open WebSocket connections in each meeting room.

State lives in memory, so the backend must run as a single process (one uvicorn worker).
"""

from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class RoomManager:
    def __init__(self) -> None:
        # meeting code -> participant id -> socket
        self._rooms: dict[str, dict[int, WebSocket]] = defaultdict(dict)

    def connect(self, code: str, participant_id: int, websocket: WebSocket) -> None:
        self._rooms[code][participant_id] = websocket

    def disconnect(self, code: str, participant_id: int, websocket: WebSocket) -> None:
        room = self._rooms.get(code)
        # Only remove the entry if it is still this socket (not a newer one for the same id).
        if room and room.get(participant_id) is websocket:
            del room[participant_id]
            if not room:
                del self._rooms[code]

    def connected_ids(self, code: str) -> set[int]:
        return set(self._rooms.get(code, {}))

    async def send(self, code: str, participant_id: int, message: dict[str, Any]) -> None:
        websocket = self._rooms.get(code, {}).get(participant_id)
        if websocket is None:
            return
        try:
            await websocket.send_json(message)
        except Exception:
            # The socket is closing; its own handler will clean up.
            pass

    async def broadcast(
        self, code: str, message: dict[str, Any], exclude: int | None = None
    ) -> None:
        for participant_id in self.connected_ids(code):
            if participant_id != exclude:
                await self.send(code, participant_id, message)

    async def close(self, code: str, participant_id: int) -> None:
        websocket = self._rooms.get(code, {}).get(participant_id)
        if websocket is None:
            return
        try:
            await websocket.close()
        except Exception:
            pass

    async def close_room(self, code: str) -> None:
        for participant_id in self.connected_ids(code):
            await self.close(code, participant_id)


rooms = RoomManager()
