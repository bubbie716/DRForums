import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { requireAdminPermission } from "@/lib/admin/auth";
import { searchAdminBans } from "@/lib/admin/ban-queries";
import { formatBanExpiry } from "@/lib/bans";

export const metadata: Metadata = { title: "Forum Bans · Admin" };

type Props = {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
};

export default async function AdminBansPage({ searchParams }: Props) {
  await requireAdminPermission("user.ban");

  const params = await searchParams;
  const result = await searchAdminBans({
    status: (params.status as "active" | "lifted" | "expired") || "",
    q: params.q,
    page: Number.parseInt(params.page ?? "1", 10) || 1,
  });

  const filterParams = {
    ...(params.q ? { q: params.q } : {}),
    ...(params.status ? { status: params.status } : {}),
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Forum Bans"
        description="Block someone from posting and messaging on the website. This does not ban them from Minecraft."
        actions={
          <Link href="/admin/bans/new" className="min-h-10 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-orange text-white hover:shadow-warm transition-all">
            Create Forum Ban
          </Link>
        }
      />

      <form className="bg-white border border-border rounded-2xl shadow-warm p-4 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <FieldLabel>Search username</FieldLabel>
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search username" className="form-field mt-1" />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select name="status" defaultValue={params.status ?? ""} className="form-field mt-1 sm:w-40">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="lifted">Lifted</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <button type="submit" className="min-h-11 px-5 font-bold rounded-xl bg-gradient-orange text-white">Filter</button>
      </form>

      <div className="bg-white border border-border rounded-2xl shadow-warm overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border bg-cream/50 text-left">
              <th className="px-5 py-3 font-bold text-text-secondary">User</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Reason</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Banned by</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Created</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Expires</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {result.bans.map((ban) => {
              const isActive = !ban.liftedAt && (!ban.expiresAt || ban.expiresAt > new Date());
              return (
                <tr key={ban.id} className="hover:bg-hover/50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/bans/${ban.id}`} className="font-semibold text-accent hover:text-accent-hover">
                      {ban.user.username}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-text-secondary max-w-xs truncate">{ban.reason}</td>
                  <td className="px-5 py-3 text-text-secondary">{ban.bannedBy.username}</td>
                  <td className="px-5 py-3 text-text-secondary">{ban.createdAt.toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-text-secondary">{formatBanExpiry(ban.expiresAt)}</td>
                  <td className="px-5 py-3">
                    {ban.liftedAt ? (
                      <span className="text-xs font-bold text-text-secondary">Lifted</span>
                    ) : isActive ? (
                      <span className="text-xs font-bold text-red-700">Active</span>
                    ) : (
                      <span className="text-xs font-bold text-text-muted">Expired</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} basePath="/admin/bans" searchParams={filterParams} />
    </div>
  );
}
