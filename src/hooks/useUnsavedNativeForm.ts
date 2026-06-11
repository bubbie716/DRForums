"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { serializeNativeForm } from "@/lib/unsavedForm";

export function useUnsavedNativeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const baselineRef = useRef("");
  const [isDirty, setIsDirty] = useState(false);

  const captureBaseline = useCallback(() => {
    if (!formRef.current) {
      return;
    }
    baselineRef.current = serializeNativeForm(formRef.current);
    setIsDirty(false);
  }, []);

  useLayoutEffect(() => {
    captureBaseline();
  }, [captureBaseline]);

  const syncDirtyState = useCallback(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    setIsDirty(serializeNativeForm(form) !== baselineRef.current);
  }, []);

  const markSaved = useCallback(() => {
    const form = formRef.current;
    if (form) {
      baselineRef.current = serializeNativeForm(form);
    }
    setIsDirty(false);
  }, []);

  return {
    formRef,
    isDirty,
    syncDirtyState,
    markSaved,
  };
}
