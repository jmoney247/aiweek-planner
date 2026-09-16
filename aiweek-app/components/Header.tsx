"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { onSavedChange, savedCount } from "@/lib/saved";

/**
 * Sticky site header: brand + Map / Gallery / My Plan nav + saved-count badge.
 */
export default function Header() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(savedCount());
    return onSavedChange(() => setCount(savedCount()));
  }, []);

  const link = (href: string, label: string) => {
    const active = href === "/#map" ? pathname === "/" : pathname === href;
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold ${
          active ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-stone-100"
        }`}
      >
        {label}
        {href === "/plan" && count > 0 && (
          <span
            aria-label={`${count} saved events`}
            className="ml-1.5 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-primary-bright px-1.5 text-xs font-bold text-white"
          >
            {count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-[60] border-b border-stone-200/70 bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="inline-flex min-h-[44px] items-center gap-2" aria-label="Boston AI Week home">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-insta-gradient text-lg text-white">
            ✦
          </span>
          <span className="text-base font-extrabold tracking-tight">
            Boston <span className="gradient-text">AI Week</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          {link("/#map", "Map")}
          {link("/gallery", "Gallery")}
          {link("/plan", "My Plan")}
        </nav>
      </div>
    </header>
  );
}
