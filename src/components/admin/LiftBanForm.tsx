"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { adminLiftBan } from "@/lib/admin/ban-actions";

export function LiftBanForm({ banId }: { banId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="bg-white border border-border rounded-2xl shadow-warm p-5 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const reason = String(new FormData(e.currentTarget).get("liftReason") ?? "");
        const result = await adminLiftBan(banId, reason);
        setLoading(false);
        if (!result.success) {
          setError(result.error ?? "Failed to lift ban.");
          return;
        }
        router.refresh();
      }}
    >
      {error ? <AdminNotice type="error" message={error} onDismiss={() => setError("")} /> : null}
      <div>
        <FieldLabel>Lift reason</FieldLabel>
        <textarea name="liftReason" required rows={3} className="form-field mt-1" placeholder="Why is this ban being lifted?" />
      </div>
      <button type="submit" disabled={loading} className="min-h-10 px-5 font-bold rounded-xl bg-gradient-orange text-white disabled:opacity-60">
        {loading ? "Lifting…" : "Lift Forum Ban"}
      </button>
    </form>
  );
}
