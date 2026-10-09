import { X } from "lucide-react";
import type { ReactNode } from "react";

interface SidePanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Right-hand panel in the meeting (participants, chat). Full screen on phones. */
export function SidePanel({ title, onClose, children, footer }: SidePanelProps) {
  return (
    <aside className="absolute inset-0 z-30 flex flex-col bg-room-panel text-white sm:static sm:z-auto sm:w-80 sm:border-l sm:border-white/10">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <h2 className="text-sm font-bold">{title}</h2>
        <button onClick={onClose} className="rounded p-1 text-white/70 hover:bg-room-hover hover:text-white" aria-label="Close panel">
          <X size={18} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-white/10 p-3">{footer}</div>}
    </aside>
  );
}
