"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { useResetOnHide } from "@/hooks/useResetOnHide";
import { api, ApiError } from "@/lib/api";
import { parseMeetingCode } from "@/lib/format";
import { rememberedName } from "@/lib/storage";

interface JoinMeetingFormProps {
  defaultName?: string;
  defaultCode?: string;
  onCancel?: () => void;
}

/**
 * Meeting ID (or invite link) + display name, like Zoom's "Join meeting" dialog.
 * Checks the meeting exists, then opens its pre-join screen with the choices filled in.
 */
export function JoinMeetingForm({ defaultName = "", defaultCode = "", onCancel }: JoinMeetingFormProps) {
  const router = useRouter();
  const [codeInput, setCodeInput] = useState(defaultCode);
  // null until the user types, so the default can arrive after the first render.
  const [typedName, setTypedName] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [noAudio, setNoAudio] = useState(false);
  const [noVideo, setNoVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  useResetOnHide(() => setChecking(false));

  const name = typedName ?? (rememberedName.get() || defaultName);
  const code = parseMeetingCode(codeInput);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code) {
      setError("Please enter a valid meeting ID or invite link");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setChecking(true);
    setError(null);
    try {
      await api.getMeeting(code);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "This meeting ID is not valid. Please check and try again." : (err as Error).message);
      setChecking(false);
      return;
    }

    if (remember) rememberedName.set(name.trim());
    const params = new URLSearchParams({ name: name.trim() });
    if (noAudio) params.set("audio", "off");
    if (noVideo) params.set("video", "off");
    router.push(`/meeting/${code}?${params}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        autoFocus
        value={codeInput}
        onChange={(e) => setCodeInput(e.target.value)}
        placeholder="Meeting ID or invite link"
        className="input"
        aria-label="Meeting ID or invite link"
      />
      <input
        value={name}
        onChange={(e) => setTypedName(e.target.value)}
        placeholder="Your name"
        maxLength={100}
        className="input"
        aria-label="Your name"
      />

      <div className="flex flex-col gap-2 py-1 text-sm">
        <Checkbox checked={remember} onChange={setRemember} label="Remember my name for future meetings" />
        <Checkbox checked={noAudio} onChange={setNoAudio} label="Don't connect to audio" />
        <Checkbox checked={noVideo} onChange={setNoVideo} label="Turn off my video" />
      </div>

      {error && <p className="text-sm text-zoom-red">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!codeInput.trim() || checking}>
          {checking ? "Joining…" : "Join"}
        </Button>
      </div>
    </form>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-zoom-blue"
      />
      {label}
    </label>
  );
}
