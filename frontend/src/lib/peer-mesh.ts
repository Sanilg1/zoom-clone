import { ICE_SERVERS } from "./config";
import type { SignalData } from "./types";

/**
 * Peer-to-peer WebRTC "mesh": one RTCPeerConnection per other participant.
 *
 * Who calls whom: a participant who joins sends an offer to everyone already in the room; the
 * people already there only answer. Only one side ever makes an offer, so two offers can never
 * collide.
 *
 * Every connection has exactly one audio and one video transceiver. Switching the outgoing video
 * between camera and screen share is a `replaceTrack` on that transceiver, so no renegotiation is
 * needed after the first offer/answer.
 *
 * The class knows nothing about React or WebSockets: signalling messages go out through
 * `sendSignal` and incoming ones are passed to `handleSignal`.
 */
export class PeerMesh {
  private connections = new Map<number, RTCPeerConnection>();
  // ICE candidates that arrived before the remote description was set.
  private pendingCandidates = new Map<number, RTCIceCandidateInit[]>();
  // Signals for one peer are processed strictly in order (offer before its candidates).
  private queues = new Map<number, Promise<void>>();
  private outgoingAudio: MediaStreamTrack | null;
  private outgoingVideo: MediaStreamTrack | null;

  constructor(
    localStream: MediaStream | null,
    private sendSignal: (to: number, data: SignalData) => void,
    private onRemoteStream: (peerId: number, stream: MediaStream) => void,
  ) {
    this.outgoingAudio = localStream?.getAudioTracks()[0] ?? null;
    this.outgoingVideo = localStream?.getVideoTracks()[0] ?? null;
  }

  /** We just joined: offer a connection to a participant who was already in the room. */
  call(peerId: number): void {
    this.enqueue(peerId, async () => {
      const pc = this.createConnection(peerId);
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });
      await this.attachOutgoingTracks(pc);
      await pc.setLocalDescription(await pc.createOffer());
      this.sendSignal(peerId, { sdp: pc.localDescription!.toJSON() });
    });
  }

  handleSignal(from: number, data: SignalData): void {
    this.enqueue(from, async () => {
      if ("sdp" in data) {
        await this.handleDescription(from, data.sdp);
      } else if ("candidate" in data) {
        await this.handleCandidate(from, data.candidate);
      }
    });
  }

  /** Swap what we send as video (camera on/off, another camera, screen share) on every connection. */
  async setOutgoingVideo(track: MediaStreamTrack | null): Promise<void> {
    this.outgoingVideo = track;
    await this.replaceOnAll("video", track);
  }

  /** Swap what we send as audio (e.g. after choosing another microphone) on every connection. */
  async setOutgoingAudio(track: MediaStreamTrack | null): Promise<void> {
    this.outgoingAudio = track;
    await this.replaceOnAll("audio", track);
  }

  remove(peerId: number): void {
    this.connections.get(peerId)?.close();
    this.connections.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.queues.delete(peerId);
  }

  close(): void {
    for (const peerId of [...this.connections.keys()]) this.remove(peerId);
  }

  // ---------- internals ----------

  private async handleDescription(from: number, description: RTCSessionDescriptionInit) {
    if (description.type === "offer") {
      // A new offer from this peer replaces any previous connection with them.
      this.remove(from);
      const pc = this.createConnection(from);
      await pc.setRemoteDescription(description);
      await this.attachOutgoingTracks(pc);
      await pc.setLocalDescription(await pc.createAnswer());
      this.sendSignal(from, { sdp: pc.localDescription!.toJSON() });
    } else {
      await this.connections.get(from)?.setRemoteDescription(description);
    }
    await this.flushCandidates(from);
  }

  private async handleCandidate(from: number, candidate: RTCIceCandidateInit) {
    const pc = this.connections.get(from);
    if (pc?.remoteDescription) {
      await pc.addIceCandidate(candidate);
    } else {
      this.pendingCandidates.set(from, [...(this.pendingCandidates.get(from) ?? []), candidate]);
    }
  }

  private async flushCandidates(peerId: number) {
    const pc = this.connections.get(peerId);
    const queued = this.pendingCandidates.get(peerId) ?? [];
    this.pendingCandidates.delete(peerId);
    for (const candidate of queued) await pc?.addIceCandidate(candidate);
  }

  private createConnection(peerId: number): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (event) => {
      if (event.candidate) this.sendSignal(peerId, { candidate: event.candidate.toJSON() });
    };
    pc.ontrack = () => {
      // Build a fresh stream from all receivers so React sees a new object and re-renders.
      this.onRemoteStream(peerId, new MediaStream(pc.getReceivers().map((r) => r.track)));
    };
    this.connections.set(peerId, pc);
    return pc;
  }

  /** Put our current mic/video tracks on the connection's transceivers (null = send nothing). */
  private async attachOutgoingTracks(pc: RTCPeerConnection) {
    await Promise.all(
      pc.getTransceivers().map((transceiver) => {
        transceiver.direction = "sendrecv";
        const kind = transceiver.receiver.track.kind;
        return transceiver.sender.replaceTrack(kind === "audio" ? this.outgoingAudio : this.outgoingVideo);
      }),
    );
  }

  private async replaceOnAll(kind: "audio" | "video", track: MediaStreamTrack | null) {
    await Promise.all(
      [...this.connections.values()].map((pc) =>
        pc.getTransceivers().find((t) => t.receiver.track.kind === kind)?.sender.replaceTrack(track),
      ),
    );
  }

  private enqueue(peerId: number, task: () => Promise<void>) {
    const previous = this.queues.get(peerId) ?? Promise.resolve();
    const next = previous.then(task).catch((error) => console.warn(`WebRTC (peer ${peerId})`, error));
    this.queues.set(peerId, next);
  }
}
