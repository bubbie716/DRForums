"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export const dropdownPanelClassName =
  "z-[200] bg-white border border-border shadow-warm overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] touch-manipulation";

export type AnchoredPosition = {
  top: number;
  left: number;
  width?: number;
  maxHeight: number;
  transform?: string;
};

type UseAnchoredFixedPositionOptions = {
  anchorRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  offset?: number;
  maxHeight?: number;
  matchWidth?: boolean;
};

export function toDropdownPanelStyle(
  position: AnchoredPosition
): CSSProperties {
  return {
    position: "fixed",
    top: position.top,
    left: position.left,
    ...(position.width !== undefined ? { width: position.width } : {}),
    maxHeight: position.maxHeight,
    transform: position.transform ?? "translateZ(0)",
  };
}

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

      const viewport = window.visualViewport;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportOffsetTop = viewport?.offsetTop ?? 0;
      const rect = anchor.getBoundingClientRect();
      const viewportPadding = 8;
      const availableBelow =
        viewportHeight -
        (rect.bottom - viewportOffsetTop) -
        viewportPadding -
        offset;
      const availableAbove =
        rect.top - viewportOffsetTop - viewportPadding - offset;
      const openAbove = availableBelow < 120 && availableAbove > availableBelow;
      const resolvedMaxHeight = Math.max(
        80,
        Math.min(maxHeight, openAbove ? availableAbove : availableBelow)
      );

      setPosition({
        top: openAbove ? rect.top - offset : rect.bottom + offset,
        left: rect.left,
        ...(matchWidth ? { width: rect.width } : {}),
        maxHeight: resolvedMaxHeight,
        transform: openAbove
          ? "translateY(-100%) translateZ(0)"
          : "translateZ(0)",
      });
    }

    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
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

    document.addEventListener("pointerdown", handleDismiss);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleDismiss);
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
