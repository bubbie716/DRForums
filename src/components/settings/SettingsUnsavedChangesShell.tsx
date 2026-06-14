"use client";

import { UnsavedChangesProvider } from "@/components/shared/unsaved-changes/UnsavedChangesProvider";

export function SettingsUnsavedChangesShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UnsavedChangesProvider>{children}</UnsavedChangesProvider>;
}
