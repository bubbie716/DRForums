import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminUnsavedChangesShell } from "@/components/admin/AdminUnsavedChangesShell";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions/definitions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const permissions = user
    ? isAdmin(user.role)
      ? ALL_PERMISSION_KEYS
      : [...(await getUserPermissions(user.id))]
    : [];

  return (
    <AdminUnsavedChangesShell>
      <div className="bg-surface min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            <AdminSidebar permissions={permissions} />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </AdminUnsavedChangesShell>
  );
}
