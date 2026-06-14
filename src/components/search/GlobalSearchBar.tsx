"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { MOBILE_HEADER_HEIGHT } from "@/components/layout/ScrollAwareHeader";
import {
  DropdownPortal,
  useDismissOnOutside,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";

type GlobalSearchBarProps = {
  className?: string;
  defaultQuery?: string;
  autoFocus?: boolean;
  size?: "compact" | "large";
};

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function GlobalSearchBar({
  className,
  defaultQuery = "",
  autoFocus = false,
  size = "compact",
}: GlobalSearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [mobileOpen, setMobileOpen] = useState(false);

  useDismissOnOutside(
    mobileOpen,
    () => setMobileOpen(false),
    triggerRef,
    panelRef
  );

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    if (mobileOpen) {
      mobileInputRef.current?.focus();
    }
  }, [mobileOpen]);

  function submitSearch(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      return;
    }

    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setMobileOpen(false);
  }

  const inputClasses = cn(
    "w-full bg-white border border-border rounded-xl text-text-dark placeholder:text-text-secondary/70",
    "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200",
    size === "large"
      ? "min-h-12 px-4 py-3 text-base"
      : "min-h-10 px-3.5 py-2 text-sm"
  );

  return (
    <>
      <form
        onSubmit={submitSearch}
        className={cn("hidden md:block flex-1 max-w-md mx-4 lg:mx-8", className)}
      >
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search threads, posts, users…"
            maxLength={100}
            autoFocus={autoFocus}
            className={cn(inputClasses, "pl-10 pr-4")}
            aria-label="Search forums"
          />
        </div>
      </form>

      <div className="md:hidden flex items-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close search" : "Open search"}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-text-dark hover:bg-hover transition-colors"
        >
          <SearchIcon className="w-5 h-5" />
        </button>

        {mobileOpen && (
          <DropdownPortal>
            <form
              ref={panelRef}
              onSubmit={submitSearch}
              className="fixed inset-x-0 z-[200] bg-cream border-b border-border px-4 py-3 shadow-warm"
              style={{
                top: MOBILE_HEADER_HEIGHT,
                transform: "translateZ(0)",
              }}
            >
              <div className="relative max-w-7xl mx-auto">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                <input
                  ref={mobileInputRef}
                  type="search"
                  name="q"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search threads, posts, users…"
                  maxLength={100}
                  autoFocus
                  className={cn(inputClasses, "pl-10 pr-4")}
                  aria-label="Search forums"
                />
              </div>
            </form>
          </DropdownPortal>
        )}
      </div>
    </>
  );
}
