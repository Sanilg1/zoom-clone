"use client";

import { Clock, House, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { ZoomLogo } from "@/components/ui/icons";
import { useDismiss } from "@/hooks/useDismiss";
import { useResetOnHide } from "@/hooks/useResetOnHide";
import type { User } from "@/lib/types";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/meetings", label: "Meetings", icon: Clock },
];

export function Navbar({ user }: { user: User | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Zoom home" className="shrink-0">
          <ZoomLogo />
        </Link>

        <nav className="flex flex-1 justify-center gap-1 sm:gap-2">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center rounded-lg px-3 py-1 text-[11px] font-bold transition-colors sm:px-4 ${
                  active ? "text-zoom-blue" : "text-ink-muted hover:bg-surface hover:text-ink"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <label className="hidden h-8 w-52 items-center gap-2 rounded-lg bg-surface px-3 text-sm text-ink-muted lg:flex">
          <Search size={15} />
          <input
            placeholder="Search"
            className="w-full bg-transparent text-ink outline-none placeholder:text-ink-muted"
          />
        </label>

        <button
          className="rounded-lg p-2 text-ink-muted hover:bg-surface hover:text-ink"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={20} />
        </button>

        <ProfileMenu user={user} />
      </div>
    </header>
  );
}

function ProfileMenu({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);
  useResetOnHide(() => setOpen(false));
  const menuRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.replace("/signin");
  }

  useDismiss(menuRef, open, () => setOpen(false));

  const name = user?.name ?? "";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative block rounded-lg"
        aria-label="Profile"
        aria-expanded={open}
      >
        <Avatar name={name || "?"} color={user?.avatar_color} size={32} />
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-zoom-green" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-64 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar name={name || "?"} color={user?.avatar_color} size={44} />
            <div className="min-w-0">
              <p className="truncate font-bold">{name}</p>
              <p className="truncate text-xs text-ink-muted">{user?.email}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                <span className="h-2 w-2 rounded-full bg-zoom-green" /> Available
              </p>
            </div>
          </div>
          {["Settings", "Help"].map((item) => (
            <button
              key={item}
              className="block w-full px-4 py-2.5 text-left text-sm hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              {item}
            </button>
          ))}
          <button
            className="block w-full border-t border-line px-4 py-2.5 text-left text-sm hover:bg-surface"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
