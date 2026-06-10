"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ScrollAwareHeaderProps = {
  children: React.ReactNode;
  className?: string;
};

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const SCROLL_DELTA = 4;

export const MOBILE_HEADER_HEIGHT =
  "calc(3.5rem + env(safe-area-inset-top, 0px))";

export function ScrollAwareHeader({
  children,
  className,
}: ScrollAwareHeaderProps) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function updateVisibility() {
      const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;
      if (!isMobile) {
        setVisible(true);
        ticking.current = false;
        return;
      }

      const currentScrollY =
        window.scrollY || document.documentElement.scrollTop || 0;
      const scrollDelta = currentScrollY - lastScrollY.current;

      if (currentScrollY <= 4) {
        setVisible(true);
      } else if (scrollDelta > SCROLL_DELTA) {
        setVisible(false);
      } else if (scrollDelta < -SCROLL_DELTA) {
        setVisible(true);
      }

      lastScrollY.current = currentScrollY;
      ticking.current = false;
    }

    function handleScroll() {
      if (ticking.current) {
        return;
      }

      ticking.current = true;
      requestAnimationFrame(updateVisibility);
    }

    lastScrollY.current =
      window.scrollY || document.documentElement.scrollTop || 0;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          "z-50 bg-cream/95 backdrop-blur-md border-b border-border shadow-sm shadow-accent/5 pt-[env(safe-area-inset-top)]",
          "max-md:fixed max-md:inset-x-0 max-md:top-0",
          "md:sticky md:top-0",
          "transition-transform duration-300 ease-out will-change-transform",
          visible ? "max-md:translate-y-0" : "max-md:-translate-y-full",
          "md:translate-y-0",
          className
        )}
      >
        {children}
      </header>
      <div
        className="shrink-0 md:hidden"
        style={{ height: MOBILE_HEADER_HEIGHT }}
        aria-hidden="true"
      />
    </>
  );
}
