"use client";

import {
  CalendarDays,
  Clock,
  FileText,
  Grid3x3,
  House,
  MessagesSquare,
  PenTool,
  Plus,
  Search,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { ZoomLogo } from "@/components/ui/icons";
import { useDismiss } from "@/hooks/useDismiss";
import { useResetOnHide } from "@/hooks/useResetOnHide";

export interface HeaderActions {
  onNewMeeting: () => void;
  onJoin: () => void;
  onSchedule: () => void;
}

/**
 * Zoom's 2026 "universal header": logo, Home, search, then a + menu for creating things,
 * the product menu (grid icon) that replaced the left navigation, and the profile menu.
 */
export function AppHeader(actions: HeaderActions) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link href="/" aria-label="Zoom home" className="shrink-0">
          <ZoomLogo />
        </Link>
        <Link
          href="/"
          className={`ml-1 hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold sm:flex ${
            pathname === "/" ? "bg-zoom-blue-light text-zoom-blue" : "text-ink-muted hover:bg-surface hover:text-ink"
          }`}
        >
          <House size={17} /> Home
        </Link>

        <div className="flex flex-1 justify-center px-2">
          <label className="hidden h-9 w-full max-w-md items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-ink-muted focus-within:border-zoom-blue md:flex">
            <Search size={15} />
            <input placeholder="Search" className="w-full bg-transparent text-ink outline-none placeholder:text-ink-muted" />
          </label>
        </div>

        <CreateMenu {...actions} />
        <ProductMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}

// ---------- shared dropdown ----------

function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  useResetOnHide(() => setOpen(false));
  return { open, setOpen, ref };
}

function Dropdown({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`absolute right-0 top-11 z-50 overflow-hidden rounded-xl border border-line bg-white shadow-xl ${className}`}>
      {children}
    </div>
  );
}

function HeaderIconButton({ label, open, onClick, children }: { label: string; open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-expanded={open}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        open ? "bg-zoom-blue-light text-zoom-blue" : "text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- + menu ----------

function CreateMenu({ onNewMeeting, onJoin, onSchedule }: HeaderActions) {
  const { open, setOpen, ref } = useMenu();
  const items: { label: string; icon: LucideIcon; tone: string; onClick: () => void }[] = [
    { label: "New meeting", icon: Video, tone: "bg-zoom-orange", onClick: onNewMeeting },
    { label: "Join meeting", icon: Plus, tone: "bg-zoom-blue", onClick: onJoin },
    { label: "Schedule meeting", icon: CalendarDays, tone: "bg-zoom-blue", onClick: onSchedule },
  ];
  return (
    <div className="relative" ref={ref}>
      <HeaderIconButton label="Create" open={open} onClick={() => setOpen((v) => !v)}>
        <Plus size={20} strokeWidth={2.4} />
      </HeaderIconButton>
      {open && (
        <Dropdown className="w-56 py-1.5">
          {items.map(({ label, icon: Icon, tone, onClick }) => (
            <button
              key={label}
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface"
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${tone}`}>
                <Icon size={15} strokeWidth={2.4} />
              </span>
              {label}
            </button>
          ))}
        </Dropdown>
      )}
    </div>
  );
}

// ---------- product menu (grid icon) ----------

const PRODUCTS: { label: string; icon: LucideIcon; href?: string }[] = [
  { label: "Home", icon: House, href: "/" },
  { label: "Meetings", icon: Clock, href: "/meetings" },
  { label: "Team Chat", icon: MessagesSquare },
  { label: "Docs", icon: FileText },
  { label: "Whiteboards", icon: PenTool },
  { label: "Calendar", icon: CalendarDays },
];

function ProductMenu() {
  const { open, setOpen, ref } = useMenu();
  const pathname = usePathname();
  return (
    <div className="relative" ref={ref}>
      <HeaderIconButton label="Products" open={open} onClick={() => setOpen((v) => !v)}>
        <Grid3x3 size={19} />
      </HeaderIconButton>
      {open && (
        <Dropdown className="w-72 p-3">
          <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">Products</p>
          <div className="grid grid-cols-3 gap-1">
            {PRODUCTS.map(({ label, icon: Icon, href }) => {
              const body = (
                <>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      href ? "bg-zoom-blue-light text-zoom-blue" : "bg-surface text-ink-muted"
                    }`}
                  >
                    <Icon size={19} />
                  </span>
                  <span className="text-xs">{label}</span>
                </>
              );
              return href ? (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg py-2.5 hover:bg-surface ${pathname === href ? "font-bold" : ""}`}
                >
                  {body}
                </Link>
              ) : (
                <span
                  key={label}
                  title="Not available in this demo"
                  aria-disabled="true"
                  className="flex cursor-not-allowed flex-col items-center gap-1.5 rounded-lg py-2.5 opacity-50"
                >
                  {body}
                </span>
              );
            })}
          </div>
          <p className="px-1 pt-2 text-[11px] text-ink-muted">Greyed-out products are not part of this demo.</p>
        </Dropdown>
      )}
    </div>
  );
}

// ---------- profile ----------

function ProfileMenu() {
  const { open, setOpen, ref } = useMenu();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const name = user?.name ?? "";

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.replace("/signin");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative ml-1 block rounded-full"
        aria-label="Profile"
        aria-expanded={open}
      >
        <Avatar name={name || "?"} color={user?.avatar_color} size={34} round />
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-zoom-green" />
      </button>

      {open && (
        <Dropdown className="w-64">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar name={name || "?"} color={user?.avatar_color} size={44} round />
            <div className="min-w-0">
              <p className="truncate font-bold">{name}</p>
              <p className="truncate text-xs text-ink-muted">{user?.email}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                <span className="h-2 w-2 rounded-full bg-zoom-green" /> Available
              </p>
            </div>
          </div>
          {["My account", "Settings", "Help"].map((item) => (
            <button key={item} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-surface" onClick={() => setOpen(false)}>
              {item}
            </button>
          ))}
          <button className="block w-full border-t border-line px-4 py-2.5 text-left text-sm hover:bg-surface" onClick={handleSignOut}>
            Sign out
          </button>
        </Dropdown>
      )}
    </div>
  );
}
