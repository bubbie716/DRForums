import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { AdminRoleBadge } from "@/components/admin/AdminRoleBadge";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { requireAdminPermission } from "@/lib/admin/auth";
import { searchAdminUsers } from "@/lib/admin/user-queries";
import { formatBanExpiry } from "@/lib/bans";
import type { Role } from "@prisma/client";

export const metadata: Metadata = { title: "Users · Admin" };

type Props = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdminPermission("user.view");

  const params = await searchParams;
  const result = await searchAdminUsers({
    q: params.q,
    role: (params.role as Role) || "",
    status: (params.status as "active" | "banned") || "",
    page: Number.parseInt(params.page ?? "1", 10) || 1,
  });

  const filterParams = {
    ...(params.q ? { q: params.q } : {}),
    ...(params.role ? { role: params.role } : {}),
    ...(params.status ? { status: params.status } : {}),
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="User Management"
        description="Find members and manage their accounts."
      />

      <form className="bg-white border border-border rounded-2xl shadow-warm p-4 md:p-5 grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <FieldLabel>Search</FieldLabel>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Username or Minecraft name"
            className="form-field mt-1"
          />
        </div>
        <div>
          <FieldLabel>Role</FieldLabel>
          <select name="role" defaultValue={params.role ?? ""} className="form-field mt-1">
            <option value="">All roles</option>
            <option value="USER">User</option>
            <option value="MODERATOR">Moderator</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select name="status" defaultValue={params.status ?? ""} className="form-field mt-1">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="banned">Forum banned</option>
          </select>
        </div>
        <button
          type="submit"
          className="md:col-span-4 min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm transition-all w-full sm:w-auto"
        >
          Search
        </button>
      </form>

      <div className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border bg-cream/50 text-left">
              <th className="px-5 py-3 font-bold text-text-secondary">Username</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Role</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Minecraft</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Joined</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Status</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {result.users.map((user) => {
              const activeBan = user.bans[0];
              const displayRole = user.userRoles[0]?.role;
              return (
                <tr key={user.id} className="hover:bg-hover/50">
                  <td className="px-5 py-3 font-semibold text-text-dark">{user.username}</td>
                  <td className="px-5 py-3">
                    {displayRole ? (
                      <AdminRoleBadge role={displayRole.name} color={displayRole.color} />
                    ) : (
                      <AdminRoleBadge role={user.role} />
                    )}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {user.minecraftUsername ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    {activeBan ? (
                      <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                        Forum banned
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/users/${user.id}`} className="font-semibold text-accent hover:text-accent-hover">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/users"
        searchParams={filterParams}
      />
    </div>
  );
}
