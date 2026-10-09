"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { WS_URL } from "@/lib/config";
import { PeerMesh } from "@/lib/peer-mesh";
import type { ChatMessage, Participant, ServerEvent, SignalData } from "@/lib/types";

export type ExitReason = "left" | "ended" | "removed" | "disconnected";

export interface RemotePeer {
  participant: Participant;
  stream: MediaStream | null;
}

export interface Reaction {
  id: number;
  participantId: number;
  emoji: string;
}

interface Options {
  code: string;
  self: Participant;
  localStream: MediaStream | null;
  onMutedByHost: () => void;
  /** We became host (new key) or stopped being host (null). */
  onHostKey: (hostKey: string | null) => void;
  onExit: (reason: ExitReason) => void;
}

const REACTION_MS = 3000;
let nextReactionId = 1;

function updatePeer(peers: Map<number, RemotePeer>, id: number, change: (peer: RemotePeer) => RemotePeer) {
  const peer = peers.get(id);
  return peer ? new Map(peers).set(id, change(peer)) : peers;
}

/**
 * Everything live about the meeting: the WebSocket to the server, the WebRTC connections to the
 * other participants, the chat and the reactions.
 */
export function useMeetingRoom({ code, self, localStream, onMutedByHost, onHostKey, onExit }: Options) {
  // Our own participant record; the server updates it (e.g. role changes when host is handed over).
  const [selfParticipant, setSelfParticipant] = useState(self);
  const [peers, setPeers] = useState<Map<number, RemotePeer>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const meshRef = useRef<PeerMesh | null>(null);
  const exitedRef = useRef(false);
  // The stream is chosen on the pre-join screen and does not change while in the room.
  const localStreamRef = useRef(localStream);
  // Latest callbacks, so the socket does not have to reconnect when the parent re-renders.
  const callbacksRef = useRef({ onMutedByHost, onHostKey, onExit });
  useEffect(() => {
    callbacksRef.current = { onMutedByHost, onHostKey, onExit };
  });

  const exit = useCallback((reason: ExitReason) => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    callbacksRef.current.onExit(reason);
  }, []);

  const send = useCallback((message: object) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }, []);

  useEffect(() => {
    const socket = new WebSocket(`${WS_URL}/ws/meetings/${code}?participant_id=${self.id}`);
    socketRef.current = socket;

    const sendSignal = (to: number, data: SignalData) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "signal", to, data }));
    };
    const mesh = new PeerMesh(localStreamRef.current, sendSignal, (peerId, stream) =>
      setPeers((prev) => updatePeer(prev, peerId, (peer) => ({ ...peer, stream }))),
    );
    meshRef.current = mesh;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => exit("disconnected");
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data) as ServerEvent;
      switch (event.type) {
        case "room-state":
          // We are the newcomer: list everyone already here and call each of them.
          setPeers(new Map(event.participants.map((p) => [p.id, { participant: p, stream: null }])));
          event.participants.forEach((p) => mesh.call(p.id));
          break;
        case "participant-joined":
          // They will call us; just show their tile for now.
          setPeers((prev) => new Map(prev).set(event.participant.id, { participant: event.participant, stream: null }));
          break;
        case "participant-updated":
          if (event.participant.id === self.id) {
            setSelfParticipant(event.participant);
            if (event.participant.role !== "host") callbacksRef.current.onHostKey(null);
          } else {
            setPeers((prev) => updatePeer(prev, event.participant.id, (peer) => ({ ...peer, participant: event.participant })));
          }
          break;
        case "host-granted":
          callbacksRef.current.onHostKey(event.host_key);
          break;
        case "participant-left":
          mesh.remove(event.participant_id);
          setPeers((prev) => {
            const next = new Map(prev);
            next.delete(event.participant_id);
            return next;
          });
          break;
        case "signal":
          mesh.handleSignal(event.from, event.data);
          break;
        case "chat":
          setMessages((prev) => [...prev, event.message]);
          break;
        case "reaction": {
          const reaction = { id: nextReactionId++, participantId: event.participant_id, emoji: event.emoji };
          setReactions((prev) => [...prev, reaction]);
          setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== reaction.id)), REACTION_MS);
          break;
        }
        case "muted-by-host":
          callbacksRef.current.onMutedByHost();
          break;
        case "removed":
          exit("removed");
          break;
        case "meeting-ended":
          exit("ended");
          break;
      }
    };

    return () => {
      socket.onclose = null;
      socket.close();
      mesh.close();
      socketRef.current = null;
      meshRef.current = null;
    };
  }, [code, self.id, exit]);

  const leave = useCallback(() => {
    exit("left");
    socketRef.current?.close();
  }, [exit]);

  const sendChat = useCallback((body: string) => send({ type: "chat", body }), [send]);
  const sendReaction = useCallback((emoji: string) => send({ type: "reaction", emoji }), [send]);
  const sendMediaState = useCallback(
    (state: { is_muted: boolean; is_video_on: boolean; is_sharing_screen: boolean }) =>
      send({ type: "media-state", ...state }),
    [send],
  );
  const setOutgoingVideo = useCallback(
    (track: MediaStreamTrack | null) => meshRef.current?.setOutgoingVideo(track) ?? Promise.resolve(),
    [],
  );

  return {
    self: selfParticipant,
    peers: [...peers.values()],
    messages,
    reactions,
    connected,
    leave,
    sendChat,
    sendReaction,
    sendMediaState,
    setOutgoingVideo,
  };
}
