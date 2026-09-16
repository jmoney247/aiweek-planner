"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { onSavedChange, savedCount } from "@/lib/saved";

export default function Header() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(savedCount());
    return onSavedChange(() => setCount(savedCount()));
  }, []);

  const link = (href: string, label: string, match: (p: string) => boolean) => {
    const active = match(pathname);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`inline-flex min-h-[44px] items-center rounded-full px-3 text-sm font-semibold transition-colors sm:px-4 ${
          active
            ? "bg-pink text-white shadow-sm"
            : "text-ink-soft hover:bg-canvas-soft hover:text-ink"
        }`}
      >
        {label}
        {href === "/plan" && count > 0 && (
          <span
            aria-label={`${count} saved events`}
            className={`ml-1.5 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
              active ? "bg-white/25 text-white" : "bg-pink text-white"
            }`}
          >
            {count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-[60] border-b border-zinc-200/70 bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2"
          aria-label="Boston AI Week home"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full hero-gradient-bg text-sm font-bold text-white"
          >
            ✦
          </span>
          <span className="whitespace-nowrap text-sm font-extrabold tracking-tight sm:text-base">
            Boston <span className="gradient-text">AI Week</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          {link("/#map", "Map", (p) => p === "/")}
          {link("/gallery", "What people are saying", (p) => p === "/gallery")}
          {link("/plan", "My Plan", (p) => p === "/plan")}
        </nav>
      </div>
    </header>
  );
}
