"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
const LEAVE_CONFIRM_MESSAGE =
  "You have unsaved changes. Leave this page without saving?";

type UnsavedChangesContextValue = {
  isDirty: boolean;
  setSourceDirty: (id: string, dirty: boolean) => void;
  clearAll: () => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null
);

export function useUnsavedChangesContext() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useUnsavedChangesContext must be used within UnsavedChangesProvider"
    );
  }
  return context;
}

export function useUnsavedChangesFlag(id: string, isDirty: boolean) {
  const { setSourceDirty } = useUnsavedChangesContext();

  useEffect(() => {
    setSourceDirty(id, isDirty);
    return () => setSourceDirty(id, false);
  }, [id, isDirty, setSourceDirty]);
}

export function useUnsavedChangesForm(id: string) {
  const { setSourceDirty, clearAll } = useUnsavedChangesContext();

  const markDirty = useCallback(() => {
    setSourceDirty(id, true);
  }, [id, setSourceDirty]);

  const markSaved = useCallback(() => {
    setSourceDirty(id, false);
  }, [id, setSourceDirty]);

  return { markDirty, markSaved, clearAll };
}

function UnsavedChangesBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 z-[60] px-4 top-14 md:top-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="rounded-b-xl border border-t-0 border-amber-300/80 bg-amber-50 px-4 py-3 shadow-warm text-sm font-semibold text-amber-950 text-center">
          You have unsaved changes. Save your work before leaving this page.
        </div>
      </div>
    </div>
  );
}

function UnsavedChangesGuard({ isDirty }: { isDirty: boolean }) {
  const router = useRouter();
  const bypassRef = useRef(false);
  const historyGuardRef = useRef(false);

  const confirmLeave = useCallback(() => {
    return window.confirm(LEAVE_CONFIRM_MESSAGE);
  }, []);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty || historyGuardRef.current) {
      return;
    }

    historyGuardRef.current = true;
    const currentUrl = window.location.href;
    history.pushState({ unsavedChangesGuard: true }, "", currentUrl);

    function handlePopState() {
      if (bypassRef.current) {
        return;
      }

      if (confirmLeave()) {
        bypassRef.current = true;
        history.back();
        return;
      }

      history.pushState({ unsavedChangesGuard: true }, "", currentUrl);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      historyGuardRef.current = false;
    };
  }, [isDirty, confirmLeave]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      if (bypassRef.current) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let destination: URL;
      try {
        destination = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) {
        return;
      }

      if (destination.pathname === window.location.pathname && destination.search === window.location.search) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (!confirmLeave()) {
        return;
      }

      bypassRef.current = true;
      if (destination.pathname + destination.search + destination.hash === href || href.startsWith("/")) {
        router.push(href);
        return;
      }

      window.location.assign(destination.href);
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [isDirty, confirmLeave, router]);

  useEffect(() => {
    if (!isDirty) {
      bypassRef.current = false;
    }
  }, [isDirty]);

  return null;
}

export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dirtySourcesRef = useRef(new Set<string>());
  const [isDirty, setIsDirty] = useState(false);

  const setSourceDirty = useCallback((id: string, dirty: boolean) => {
    if (dirty) {
      dirtySourcesRef.current.add(id);
    } else {
      dirtySourcesRef.current.delete(id);
    }
    setIsDirty(dirtySourcesRef.current.size > 0);
  }, []);

  const clearAll = useCallback(() => {
    dirtySourcesRef.current.clear();
    setIsDirty(false);
  }, []);

  const value = useMemo(
    () => ({
      isDirty,
      setSourceDirty,
      clearAll,
    }),
    [isDirty, setSourceDirty, clearAll]
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {isDirty ? <UnsavedChangesBanner /> : null}
      <UnsavedChangesGuard isDirty={isDirty} />
      {children}
    </UnsavedChangesContext.Provider>
  );
}
