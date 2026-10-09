"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { formatTime } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import { SidePanel } from "./SidePanel";

interface ChatPanelProps {
  messages: ChatMessage[];
  selfId: number;
  onSend: (body: string) => void;
  onClose: () => void;
}

export function ChatPanel({ messages, selfId, onSend, onClose }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  }

  return (
    <SidePanel
      title="Meeting Chat"
      onClose={onClose}
      footer={
        <form onSubmit={submit}>
          <p className="mb-1.5 text-xs text-white/60">
            To: <span className="rounded bg-zoom-blue px-1.5 py-0.5 text-white">Everyone</span>
          </p>
          <div className="flex items-end gap-2 rounded-lg border border-white/20 p-2 focus-within:border-zoom-blue">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              maxLength={2000}
              placeholder="Type message here…"
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-white/40"
            />
            <button type="submit" disabled={!draft.trim()} className="p-1 text-zoom-blue disabled:text-white/30" aria-label="Send">
              <SendHorizontal size={18} />
            </button>
          </div>
        </form>
      }
    >
      {messages.length === 0 ? (
        <p className="px-6 pt-10 text-center text-sm text-white/50">Messages addressed to &quot;Everyone&quot; will appear here.</p>
      ) : (
        <ul className="flex flex-col gap-3 p-4">
          {messages.map((message) => (
            <li key={message.id}>
              <p className="text-xs text-white/50">
                {message.participant_id === selfId ? "Me" : message.sender_name}
                <span className="ml-2">{formatTime(message.sent_at)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{message.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div ref={endRef} />
    </SidePanel>
  );
}
