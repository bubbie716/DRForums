import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNoticeBanner } from "@/components/admin/AdminNoticeBanner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RoleManagementList } from "@/components/admin/RoleManagementList";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getAdminRoles } from "@/lib/admin/role-queries";

export const metadata: Metadata = { title: "Roles · Admin" };

export default async function AdminRolesPage() {
  await requireAdminPermission("admin.roles.manage");
  const roles = await getAdminRoles();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Roles"
        description="Set what each member rank can do on the site."
        actions={
          <Link href="/admin/roles/new" className="min-h-10 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-orange text-white hover:shadow-warm transition-all">
            New Role
          </Link>
        }
      />

      <Suspense fallback={null}>
        <AdminNoticeBanner />
      </Suspense>

      <RoleManagementList
        roles={roles.map((role) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          isSystem: role.isSystem,
          isDefault: role.isDefault,
          userCount: role._count.users,
          permissionCount: role._count.permissions,
        }))}
      />
    </div>
  );
}
