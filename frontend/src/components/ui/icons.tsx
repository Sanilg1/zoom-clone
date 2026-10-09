// Icons that lucide-react does not provide.

import type { SVGProps } from "react";

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
