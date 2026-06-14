import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminRoleBadge } from "@/components/admin/AdminRoleBadge";
import { UserDetailActions } from "@/components/admin/UserDetailActions";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions/definitions";
import {
  getAdminUserDetail,
  getAdminUserPosts,
  getAdminUserThreads,
} from "@/lib/admin/user-queries";
import { getAdminRoles } from "@/lib/admin/role-queries";
import {
  canActorManageRolePriority,
  getActorTopRolePriority,
} from "@/lib/role-hierarchy";
import { formatBanExpiry } from "@/lib/bans";
import { getActiveBan } from "@/lib/bans";
import { getAdminUserDetailTitle } from "@/lib/metadata";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: await getAdminUserDetailTitle(id) };
}

export default async function AdminUserDetailPage({ params }: Props) {
  await requireAdminPermission("user.view");
  const actor = await getSessionUser();
  const { id } = await params;

  const [user, threads, posts, allRoles, activeBan] = await Promise.all([
    getAdminUserDetail(id),
    getAdminUserThreads(id),
    getAdminUserPosts(id),
    getAdminRoles(),
    getActiveBan(id),
  ]);

  if (!user) notFound();

  const [actorPermissions, actorTopPriority] = actor
    ? await Promise.all([
        isAdmin(actor.role)
          ? Promise.resolve(ALL_PERMISSION_KEYS)
          : getUserPermissions(actor.id).then((perms) => [...perms]),
        getActorTopRolePriority(actor.id),
      ])
    : [[], null];
  const assignedRoleIds = user.userRoles.map((ur) => ur.roleId);
  const manageableRoles = allRoles
    .filter((role) => canActorManageRolePriority(actorTopPriority, role.priority))
    .map((role) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      priority: role.priority,
    }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={user.username}
        description={user.minecraftUsername ? `Minecraft: ${user.minecraftUsername}` : "No Minecraft linked"}
        actions={
          <Link href="/admin/users" className="text-sm font-semibold text-accent hover:text-accent-hover">
            ← All users
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6">
            <h2 className="font-bold text-text-dark mb-4">Profile</h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-text-secondary">Minecraft</dt>
                <dd className="font-semibold text-text-dark">{user.minecraftUsername ?? "Not linked"}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Minecraft account</dt>
                <dd className="text-text-dark">{user.minecraftUsername ?? "Not linked"}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Linked date</dt>
                <dd className="text-text-dark">{user.minecraftLinkedAt?.toLocaleString() ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Joined</dt>
                <dd className="text-text-dark">{user.createdAt.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Threads</dt>
                <dd className="text-text-dark">{user._count.threads}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Posts</dt>
                <dd className="text-text-dark">{user._count.posts}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Private messages</dt>
                <dd className="text-text-dark">{user._count.sentMessages}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Bio</dt>
                <dd className="text-text-dark">{user.bio ?? "—"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.userRoles.map((ur) => (
                <AdminRoleBadge key={ur.id} role={ur.role.name} color={ur.role.color} />
              ))}
            </div>
          </section>

          {activeBan ? (
            <section className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <h2 className="font-bold text-red-800">Active Forum Ban</h2>
              <p className="text-xs text-red-600 mt-1">Website only — does not affect Minecraft server access.</p>
              <p className="text-sm text-red-700 mt-2">{activeBan.reason}</p>
              <p className="text-xs text-red-600 mt-1">Expires: {formatBanExpiry(activeBan.expiresAt)}</p>
              <Link href="/admin/bans" className="inline-block mt-3 text-sm font-semibold text-red-800 underline">
                Manage in Forum Bans
              </Link>
            </section>
          ) : null}

          <section className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-bold text-text-dark">Recent Threads</h2>
            </div>
            <div className="divide-y divide-border/60">
              {threads.map((t) => (
                <Link key={t.id} href={`/thread/${t.id}`} className="block px-5 py-3 hover:bg-hover">
                  <p className="font-semibold text-text-dark">{t.title}</p>
                  <p className="text-xs text-text-secondary">{t.forum.name} · {t.createdAt.toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-bold text-text-dark">Recent Posts</h2>
            </div>
            <div className="divide-y divide-border/60">
              {posts.map((p) => (
                <Link key={p.id} href={`/thread/${p.thread.id}`} className="block px-5 py-3 hover:bg-hover">
                  <p className="text-sm text-text-dark line-clamp-2">{p.content}</p>
                  <p className="text-xs text-text-secondary">{p.thread.title} · {p.createdAt.toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div>
          <UserDetailActions
            userId={user.id}
            username={user.username}
            isSelf={actor?.id === user.id}
            assignedRoleIds={assignedRoleIds}
            allRoles={manageableRoles}
            hasActiveBan={Boolean(activeBan)}
            actorPermissions={actorPermissions}
          />
        </div>
      </div>
    </div>
  );
}
