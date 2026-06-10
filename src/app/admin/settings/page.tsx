import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getAllSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings · Admin" };

export default async function AdminSettingsPage() {
  await requireAdminPermission("admin.settings.manage");
  const settings = await getAllSettings();

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminPageHeader
        title="Site Settings"
        description="Turn features on or off and edit basic site info."
      />
      <SiteSettingsForm settings={settings} />
    </div>
  );
}
