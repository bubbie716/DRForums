"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { adminUpdateMaintenance } from "@/lib/admin/settings-actions";
import { useUnsavedNativeForm } from "@/hooks/useUnsavedNativeForm";
import { useUnsavedChangesFlag } from "@/components/shared/unsaved-changes/UnsavedChangesProvider";

type MaintenanceFormProps = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

export function MaintenanceForm({ maintenanceMode, maintenanceMessage }: MaintenanceFormProps) {
  const router = useRouter();
  const { formRef, syncDirtyState, markSaved, isDirty } = useUnsavedNativeForm();
  useUnsavedChangesFlag("maintenance", isDirty);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      ref={formRef}
      className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6 space-y-4"
      onChange={syncDirtyState}
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const result = await adminUpdateMaintenance(new FormData(e.currentTarget));
        setLoading(false);
        if (!result.success) {
          setNotice({ type: "error", message: result.error ?? "Save failed." });
          return;
        }
        setNotice({ type: "success", message: result.message ?? "Saved." });
        markSaved();
        router.refresh();
      }}
    >
      {notice ? <AdminNotice type={notice.type} message={notice.message} onDismiss={() => setNotice(null)} /> : null}
      <label className="flex items-center gap-3 cursor-pointer">
        <input name="maintenanceMode" type="checkbox" defaultChecked={maintenanceMode} className="w-5 h-5 accent-accent" />
        <span className="font-semibold text-text-dark">Enable maintenance mode</span>
      </label>
      <div>
        <FieldLabel>Maintenance message</FieldLabel>
        <AutoResizeTextarea
          name="maintenanceMessage"
          rows={4}
          defaultValue={maintenanceMessage}
          className="form-field mt-1"
          placeholder="Message shown to visitors while maintenance mode is on"
        />
      </div>
      <button type="submit" disabled={loading} className="min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl disabled:opacity-60">
        {loading ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
