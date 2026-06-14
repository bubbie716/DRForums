"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { adminUpdateSiteSettings } from "@/lib/admin/settings-actions";
import { useUnsavedNativeForm } from "@/hooks/useUnsavedNativeForm";
import { useUnsavedChangesFlag } from "@/components/shared/unsaved-changes/UnsavedChangesProvider";

export function SiteSettingsForm({ settings }: { settings: Record<string, string> }) {
  const router = useRouter();
  const { formRef, syncDirtyState, markSaved, isDirty } = useUnsavedNativeForm();
  useUnsavedChangesFlag("site-settings", isDirty);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      ref={formRef}
      className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6 space-y-6"
      onChange={syncDirtyState}
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const result = await adminUpdateSiteSettings(new FormData(e.currentTarget));
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

      <section className="space-y-4">
        <h3 className="font-bold text-text-dark">General</h3>
        <div>
          <FieldLabel>Site name</FieldLabel>
          <input name="siteName" defaultValue={settings.siteName} className="form-field mt-1" />
        </div>
        <div>
          <FieldLabel>Tagline</FieldLabel>
          <input name="siteTagline" defaultValue={settings.siteTagline} className="form-field mt-1" />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-bold text-text-dark">Features</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input name="registrationEnabled" type="checkbox" defaultChecked={settings.registrationEnabled === "true"} className="w-4 h-4 accent-accent" />
          <span className="text-sm font-semibold">Registration enabled</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input name="dmsEnabled" type="checkbox" defaultChecked={settings.dmsEnabled === "true"} className="w-4 h-4 accent-accent" />
          <span className="text-sm font-semibold">Private messages enabled</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input name="pollsEnabled" type="checkbox" defaultChecked={settings.pollsEnabled === "true"} className="w-4 h-4 accent-accent" />
          <span className="text-sm font-semibold">Poll creation enabled</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input name="formsEnabled" type="checkbox" defaultChecked={settings.formsEnabled === "true"} className="w-4 h-4 accent-accent" />
          <span className="text-sm font-semibold">Forms enabled</span>
        </label>
      </section>

      <section className="space-y-3">
        <h3 className="font-bold text-text-dark">Profile customization</h3>
        <p className="text-sm text-text-secondary">
          Global rules for all members. Not controlled per role.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input name="allowCustomProfilePictures" type="checkbox" defaultChecked={settings.allowCustomProfilePictures === "true"} className="w-4 h-4 accent-accent" />
          <span className="text-sm font-semibold">Custom profile pictures</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input name="allowCustomBanners" type="checkbox" defaultChecked={settings.allowCustomBanners === "true"} className="w-4 h-4 accent-accent" />
          <span className="text-sm font-semibold">Custom profile banners</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input name="allowProfileBios" type="checkbox" defaultChecked={settings.allowProfileBios === "true"} className="w-4 h-4 accent-accent" />
          <span className="text-sm font-semibold">Profile bios</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input name="allowSignatures" type="checkbox" defaultChecked={settings.allowSignatures === "true"} className="w-4 h-4 accent-accent" />
          <span className="text-sm font-semibold">Post and DM signatures</span>
        </label>
        <div>
          <FieldLabel>Max bio length (characters)</FieldLabel>
          <input name="maxProfileBioLength" type="number" defaultValue={settings.maxProfileBioLength} className="form-field mt-1 w-32" />
        </div>
      </section>

      <button type="submit" disabled={loading} className="min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl disabled:opacity-60">
        {loading ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
