import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-zoom-blue text-white hover:bg-zoom-blue-hover disabled:bg-[#b9cdfc]",
  secondary: "border border-line bg-white text-ink hover:bg-surface disabled:text-ink-muted",
  danger: "bg-zoom-red text-white hover:bg-[#c51f1f] disabled:opacity-60",
  ghost: "text-zoom-blue hover:bg-zoom-blue-light disabled:text-ink-muted",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
