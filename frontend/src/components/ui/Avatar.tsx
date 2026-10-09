import { initials } from "@/lib/format";

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, color = "#0E71EB", size = 32, className = "" }: AvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-lg font-bold text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
