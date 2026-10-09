// Icons that lucide-react does not provide.

import { useId, type SVGProps } from "react";

export function ZoomLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[26px] font-black leading-none tracking-tight text-zoom-blue ${className}`}>
      zoom
    </span>
  );
}

/** Smiley face with a plus, used for the Reactions button. */
export function ReactionsIcon({ size = 24, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20.9 12.9A9 9 0 1 1 11.1 3.1" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
      <path d="M19 2v6M16 5h6" />
    </svg>
  );
}

interface MicLevelIconProps {
  /** 0 (silent) to 1 (loud): how much of the mic capsule is filled green. */
  level: number;
  size?: number;
  className?: string;
}

/** Microphone whose capsule fills with green as you speak, like Zoom's mic button. */
export function MicLevelIcon({ level, size = 24, className = "" }: MicLevelIconProps) {
  // The capsule spans y = 2..15 in the 24-unit viewBox.
  const fillHeight = 13 * Math.max(0, Math.min(1, level));
  const clipId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="9" y="2" width="6" height="13" rx="3" />
        </clipPath>
      </defs>
      <rect
        x="9"
        y={15 - fillHeight}
        width="6"
        height={fillHeight}
        clipPath={`url(#${clipId})`}
        fill="var(--color-zoom-green)"
        stroke="none"
        style={{ transition: "y 90ms linear, height 90ms linear" }}
      />
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
