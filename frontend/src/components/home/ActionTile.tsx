import type { LucideIcon } from "lucide-react";

interface ActionTileProps {
  label: string;
  icon: LucideIcon;
  color: "orange" | "blue";
  onClick: () => void;
  disabled?: boolean;
  /** Fill the icon shape (Zoom's camera icon is solid). */
  filled?: boolean;
}

const COLORS = {
  orange: "bg-zoom-orange hover:bg-zoom-orange-hover",
  blue: "bg-zoom-blue hover:bg-zoom-blue-hover",
};

/** One of the four big square buttons on Zoom's home screen. */
export function ActionTile({ label, icon: Icon, color, onClick, disabled, filled }: ActionTileProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-2.5 disabled:cursor-wait disabled:opacity-70"
    >
      <span
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-[22px] text-white shadow-sm transition-colors sm:h-20 sm:w-20 sm:rounded-3xl ${COLORS[color]}`}
      >
        <Icon size={32} strokeWidth={2} fill={filled ? "currentColor" : "none"} />
      </span>
      <span className="text-[13px] text-ink">{label}</span>
    </button>
  );
}
