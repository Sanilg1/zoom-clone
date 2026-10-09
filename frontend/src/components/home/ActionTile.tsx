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
  orange: "bg-zoom-orange group-hover:bg-zoom-orange-hover",
  blue: "bg-zoom-blue group-hover:bg-zoom-blue-hover",
};

/** One of the quick shortcuts on Home (New meeting, Join, Schedule, Share screen). */
export function ActionTile({ label, icon: Icon, color, onClick, disabled, filled }: ActionTileProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-2.5 rounded-2xl border border-line bg-white px-3 py-4 shadow-sm transition-shadow hover:shadow-md disabled:cursor-wait disabled:opacity-70 sm:py-5"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-colors sm:h-14 sm:w-14 ${COLORS[color]}`}>
        <Icon size={26} strokeWidth={2} fill={filled ? "currentColor" : "none"} />
      </span>
      <span className="text-[13px] font-bold text-ink">{label}</span>
    </button>
  );
}
