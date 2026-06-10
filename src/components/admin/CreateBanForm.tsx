"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { adminCreateBan } from "@/lib/admin/ban-actions";
import { FORUM_BAN_SCOPE_NOTE } from "@/lib/ban-copy";

export function CreateBanForm({ defaultUserId = "" }: { defaultUserId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        const result = await adminCreateBan({
          userId: String(fd.get("userId") ?? ""),
          reason: String(fd.get("reason") ?? ""),
          internalNote: String(fd.get("internalNote") ?? ""),
          duration: String(fd.get("duration") ?? "permanent") as "permanent" | "1d" | "3d" | "7d" | "30d" | "custom",
          customExpiresAt: String(fd.get("customExpiresAt") ?? ""),
        });
        setLoading(false);
        if (!result.success) {
          setError(result.error ?? "Failed to create ban.");
          return;
        }
        router.push("/admin/bans");
        router.refresh();
      }}
    >
      {error ? <AdminNotice type="error" message={error} onDismiss={() => setError("")} /> : null}
      <p className="text-sm text-text-secondary leading-relaxed rounded-xl border border-border bg-cream/60 px-4 py-3">
        {FORUM_BAN_SCOPE_NOTE}
      </p>
      <div>
        <FieldLabel>Member account ID</FieldLabel>
        <input name="userId" required defaultValue={defaultUserId} placeholder="Copy from the user's admin page" className="form-field mt-1" />
        <p className="text-xs text-text-secondary mt-1">Open the user in Admin → Users and copy their account ID from the ban form link.</p>
      </div>
      <div>
        <FieldLabel>Forum ban reason</FieldLabel>
        <textarea name="reason" required rows={3} className="form-field mt-1" placeholder="Reason shown to the user on the website" />
      </div>
      <div>
        <FieldLabel>Internal note (optional)</FieldLabel>
        <textarea name="internalNote" rows={2} className="form-field mt-1" placeholder="Staff-only note, not shown to the user" />
      </div>
      <div>
        <FieldLabel>Duration</FieldLabel>
        <select name="duration" className="form-field mt-1" defaultValue="7d">
          <option value="permanent">Permanent</option>
          <option value="1d">1 day</option>
          <option value="3d">3 days</option>
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
          <option value="custom">Custom date</option>
        </select>
      </div>
      <div>
        <FieldLabel>End date & time</FieldLabel>
        <input type="datetime-local" name="customExpiresAt" className="form-field mt-1" />
      </div>
      <button type="submit" disabled={loading} className="min-h-11 px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl disabled:opacity-60">
        {loading ? "Creating…" : "Create Forum Ban"}
      </button>
    </form>
  );
}
