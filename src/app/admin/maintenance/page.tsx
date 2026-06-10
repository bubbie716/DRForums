import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MaintenanceForm } from "@/components/admin/MaintenanceForm";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getAllSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Maintenance · Admin" };

export default async function AdminMaintenancePage() {
  await requireAdminPermission("admin.maintenance.manage");
  const settings = await getAllSettings();

  return (
    <div className="space-y-6 max-w-2xl">
      <AdminPageHeader
        title="Maintenance Mode"
        description="Show a maintenance page to non-admin visitors while you work on the site."
      />
      <MaintenanceForm
        maintenanceMode={settings.maintenanceMode === "true"}
        maintenanceMessage={settings.maintenanceMessage}
      />
    </div>
  );
}
