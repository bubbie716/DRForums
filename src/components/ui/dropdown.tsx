"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export const dropdownPanelClassName =
  "z-[200] bg-white border border-border shadow-warm overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] [transform:translateZ(0)] [isolation:isolate] touch-manipulation";

type AnchoredPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

type UseAnchoredFixedPositionOptions = {
  anchorRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  offset?: number;
  maxHeight?: number;
  matchWidth?: boolean;
};

export function useAnchoredFixedPosition({
  anchorRef,
  enabled,
  offset = 8,
  maxHeight = 224,
  matchWidth = true,
}: UseAnchoredFixedPositionOptions): AnchoredPosition | null {
  const [position, setPosition] = useState<AnchoredPosition | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setPosition(null);
      return;
    }

    function update() {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const viewportPadding = 8;
      const availableBelow =
        window.innerHeight - rect.bottom - viewportPadding - offset;
      const availableAbove = rect.top - viewportPadding - offset;
      const openAbove = availableBelow < 120 && availableAbove > availableBelow;
      const resolvedMaxHeight = Math.max(
        80,
        Math.min(
          maxHeight,
          openAbove ? availableAbove : availableBelow
        )
      );

      setPosition({
        top: openAbove
          ? rect.top - offset - resolvedMaxHeight
          : rect.bottom + offset,
        left: rect.left,
        width: matchWidth ? rect.width : anchor.offsetWidth,
        maxHeight: resolvedMaxHeight,
      });
    }

    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, enabled, offset, maxHeight, matchWidth]);

  return position;
}

export function useDismissOnOutside(
  enabled: boolean,
  onDismiss: () => void,
  ...refs: RefObject<HTMLElement | null>[]
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleDismiss(event: Event) {
      const target = event.target as Node;

      if (refs.some((ref) => ref.current?.contains(target))) {
        return;
      }

      onDismiss();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("mousedown", handleDismiss);
    document.addEventListener("touchstart", handleDismiss, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDismiss);
      document.removeEventListener("touchstart", handleDismiss);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onDismiss, ...refs]);
}

type DropdownPortalProps = {
  children: ReactNode;
};

export function DropdownPortal({ children }: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
}
