import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RoleForm } from "@/components/admin/RoleForm";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getAllPermissionsGrouped } from "@/lib/admin/role-queries";

export const metadata: Metadata = { title: "New Role · Admin" };

export default async function AdminNewRolePage() {
  await requireAdminPermission("admin.roles.manage");
  const permissionGroups = await getAllPermissionsGrouped();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Create Role"
        actions={<Link href="/admin/roles" className="text-sm font-semibold text-accent">← Back</Link>}
      />
      <RoleForm mode="create" permissionGroups={permissionGroups} />
    </div>
  );
}
