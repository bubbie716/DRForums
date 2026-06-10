import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RoleForm } from "@/components/admin/RoleForm";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getAdminRoleDetail, getAllPermissionsGrouped } from "@/lib/admin/role-queries";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditRolePage({ params }: Props) {
  await requireAdminPermission("admin.roles.manage");
  const { id } = await params;
  const [role, permissionGroups] = await Promise.all([
    getAdminRoleDetail(id),
    getAllPermissionsGrouped(),
  ]);
  if (!role) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Edit ${role.name}`}
        actions={<Link href="/admin/roles" className="text-sm font-semibold text-accent">← Back</Link>}
      />
      <RoleForm
        mode="edit"
        roleId={role.id}
        isSystem={role.isSystem}
        userCount={role._count.users}
        initial={{
          name: role.name,
          slug: role.slug,
          description: role.description ?? "",
          color: role.color ?? "#e29027",
          isDefault: role.isDefault,
          permissionIds: role.permissions.map((p) => p.permissionId),
        }}
        permissionGroups={permissionGroups}
      />
    </div>
  );
}
