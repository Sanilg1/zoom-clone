"use client";

import { useEffect, useRef } from "react";

import { useAudioLevel } from "@/hooks/useAudioLevel";
import type { LocalMedia } from "@/hooks/useLocalMedia";
import { SidePanel } from "./SidePanel";

/**
 * The right-hand "Audio & video" panel opened from the ^ next to Mute / Start Video:
 * pick a microphone or camera, see your input level and a camera preview.
 */
export function SettingsPanel({ media, onClose }: { media: LocalMedia; onClose: () => void }) {
  const level = useAudioLevel(media.stream, media.audioOn);

  return (
    <SidePanel title="Audio & video" onClose={onClose}>
      <div className="flex flex-col gap-6 p-4 text-sm">
        <section className="flex flex-col gap-2">
          <label htmlFor="settings-mic" className="font-bold">
            Microphone
          </label>
          <DeviceSelect
            id="settings-mic"
            devices={media.devices.microphones}
            value={media.microphoneId}
            empty="No microphone found"
            onChange={(id) => void media.switchMicrophone(id)}
          />
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="shrink-0">Input level</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15" role="meter" aria-valuenow={level} aria-valuemin={0} aria-valuemax={1} aria-label="Microphone level">
              <span className="block h-full rounded-full bg-zoom-green transition-[width] duration-100" style={{ width: `${level * 100}%` }} />
            </span>
          </div>
          {!media.audioOn && <p className="text-xs text-white/60">You are muted.</p>}
        </section>

        <section className="flex flex-col gap-2">
          <label htmlFor="settings-camera" className="font-bold">
            Camera
          </label>
          <DeviceSelect
            id="settings-camera"
            devices={media.devices.cameras}
            value={media.cameraId}
            empty="No camera found"
            onChange={(id) => void media.switchCamera(id)}
          />
          <CameraPreview track={media.videoTrack} />
          {!media.videoOn && (
            <button
              onClick={() => void media.setVideoOn(true)}
              disabled={!media.canUseVideo}
              className="self-start rounded-lg bg-zoom-blue px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              Start Video
            </button>
          )}
        </section>
      </div>
    </SidePanel>
  );
}

interface DeviceSelectProps {
  id: string;
  devices: MediaDeviceInfo[];
  value: string | undefined;
  empty: string;
  onChange: (deviceId: string) => void;
}

function DeviceSelect({ id, devices, value, empty, onChange }: DeviceSelectProps) {
  if (devices.length === 0) return <p className="text-xs text-white/60">{empty}</p>;
  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-white/20 bg-room px-2 text-sm text-white outline-none focus:border-zoom-blue"
    >
      {devices.map((device, index) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label || `Device ${index + 1}`}
        </option>
      ))}
    </select>
  );
}

function CameraPreview({ track }: { track: MediaStreamTrack | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = track ? new MediaStream([track]) : null;
  }, [track]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-room-tile">
      <video ref={ref} autoPlay playsInline muted className={`mirror h-full w-full object-cover ${track ? "" : "invisible"}`} />
      {!track && <p className="absolute inset-0 flex items-center justify-center text-xs text-white/60">Your camera is off</p>}
    </div>
  );
}
