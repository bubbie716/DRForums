import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions/definitions";
import { canAccessAdminNavItem } from "@/lib/permissions/requirements";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { getAdminDashboardStats } from "@/lib/admin/dashboard-queries";
import { formatModerationActionLabel } from "@/lib/admin/copy";
import { formatBanExpiry } from "@/lib/bans";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
  await requireAdminPermission("admin.dashboard.view");
  const [stats, actor] = await Promise.all([
    getAdminDashboardStats(),
    getSessionUser(),
  ]);
  const permissions = actor
    ? isAdmin(actor.role)
      ? ALL_PERMISSION_KEYS
      : [...(await getUserPermissions(actor.id))]
    : [];
  const quickActions = [
    { href: "/admin/users", label: "Manage Users" },
    { href: "/admin/bans/new", label: "Create Forum Ban" },
    { href: "/admin/roles", label: "Manage Roles" },
    { href: "/admin/forums", label: "Forum Structure" },
    { href: "/admin/maintenance", label: "Maintenance Mode" },
  ].filter((action) => {
    const permissionPath = action.href.startsWith("/admin/bans")
      ? "/admin/bans"
      : action.href;
    return canAccessAdminNavItem(permissions, permissionPath);
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="A quick look at site activity and recent staff actions."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard label="Total Users" value={stats.totalUsers} />
        <AdminStatCard
          label="Linked Minecraft"
          value={stats.linkedMinecraft}
          subtext={`${stats.totalUsers - stats.linkedMinecraft} unlinked`}
        />
        <AdminStatCard
          label="Active Forum Bans"
          value={stats.activeBans}
          variant={stats.activeBans > 0 ? "danger" : "default"}
        />
        <AdminStatCard label="Total Threads" value={stats.totalThreads} />
        <AdminStatCard label="Total Posts" value={stats.totalPosts} />
        <AdminStatCard label="Message threads" value={stats.totalConversations} />
        <AdminStatCard
          label="Maintenance Mode"
          value={stats.maintenanceMode ? "ON" : "OFF"}
          variant={stats.maintenanceMode ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-text-dark">Recent Users</h2>
            <Link href="/admin/users" className="text-sm font-semibold text-accent hover:text-accent-hover">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border/60">
            {stats.recentUsers.map((user) => (
              <Link
                key={user.id}
                href={`/admin/users/${user.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-hover transition-colors"
              >
                <div>
                  <p className="font-semibold text-text-dark">{user.username}</p>
                  <p className="text-xs text-text-secondary">
                    {user.minecraftUsername ?? "No Minecraft"} · {user.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs font-bold uppercase text-accent">{user.role}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-text-dark">Recent staff actions</h2>
            <Link href="/admin/logs" className="text-sm font-semibold text-accent hover:text-accent-hover">
              View logs
            </Link>
          </div>
          <div className="divide-y divide-border/60">
            {stats.recentLogs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-text-secondary">Nothing logged yet.</p>
            ) : (
              stats.recentLogs.map((log) => (
                <div key={log.id} className="px-5 py-3">
                  <p className="text-sm font-semibold text-text-dark">
                    {formatModerationActionLabel(log.action)}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {log.actor?.username ?? "System"}
                    {log.targetUser ? ` → ${log.targetUser.username}` : ""} ·{" "}
                    {log.createdAt.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-text-dark">Recent Forum Bans</h2>
          <Link href="/admin/bans" className="text-sm font-semibold text-accent hover:text-accent-hover">
            Manage forum bans
          </Link>
        </div>
        <div className="divide-y divide-border/60">
          {stats.recentBans.length === 0 ? (
            <p className="px-5 py-6 text-sm text-text-secondary">No forum bans recorded.</p>
          ) : (
            stats.recentBans.map((ban) => (
              <Link
                key={ban.id}
                href={`/admin/bans/${ban.id}`}
                className="block px-5 py-3 hover:bg-hover transition-colors"
              >
                <p className="font-semibold text-text-dark">{ban.user.username}</p>
                <p className="text-sm text-text-secondary mt-0.5">{ban.reason}</p>
                <p className="text-xs text-text-muted mt-1">
                  By {ban.bannedBy.username} · Expires {formatBanExpiry(ban.expiresAt)} ·{" "}
                  {ban.liftedAt ? "Lifted" : ban.expiresAt && ban.expiresAt < new Date() ? "Expired" : "Active"}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>

      {quickActions.length > 0 ? (
        <section className="bg-yellow/20 border border-border rounded-2xl p-5 md:p-6">
          <h2 className="font-bold text-text-dark mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, index) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  index === 0
                    ? "min-h-10 px-4 py-2 text-sm font-bold rounded-xl bg-gradient-orange text-white hover:shadow-warm transition-all"
                    : "min-h-10 px-4 py-2 text-sm font-bold rounded-xl bg-white border border-border text-text-dark hover:bg-hover transition-colors"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
