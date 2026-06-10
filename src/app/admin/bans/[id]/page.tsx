import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LiftBanForm } from "@/components/admin/LiftBanForm";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getAdminBanDetail } from "@/lib/admin/ban-queries";
import { formatBanExpiry } from "@/lib/bans";

type Props = { params: Promise<{ id: string }> };

export default async function AdminBanDetailPage({ params }: Props) {
  await requireAdminPermission("user.ban");
  const { id } = await params;
  const ban = await getAdminBanDetail(id);
  if (!ban) notFound();

  const isActive = !ban.liftedAt && (!ban.expiresAt || ban.expiresAt > new Date());

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminPageHeader
        title={`Forum ban: ${ban.user.username}`}
        description="Website-only ban. Minecraft access is not affected."
        actions={<Link href="/admin/bans" className="text-sm font-semibold text-accent">← All forum bans</Link>}
      />

      <section className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6 space-y-3 text-sm">
        <p><span className="text-text-secondary">User:</span> <Link href={`/admin/users/${ban.user.id}`} className="font-semibold text-accent">{ban.user.username}</Link></p>
        <p><span className="text-text-secondary">Reason:</span> {ban.reason}</p>
        {ban.internalNote ? <p><span className="text-text-secondary">Internal note:</span> {ban.internalNote}</p> : null}
        <p><span className="text-text-secondary">Banned by:</span> {ban.bannedBy.username}</p>
        <p><span className="text-text-secondary">Created:</span> {ban.createdAt.toLocaleString()}</p>
        <p><span className="text-text-secondary">Expires:</span> {formatBanExpiry(ban.expiresAt)}</p>
        {ban.liftedAt ? (
          <>
            <p><span className="text-text-secondary">Lifted:</span> {ban.liftedAt.toLocaleString()} by {ban.liftedBy?.username}</p>
            <p><span className="text-text-secondary">Lift reason:</span> {ban.liftReason}</p>
          </>
        ) : null}
        <p>
          <span className="text-text-secondary">Status:</span>{" "}
          {ban.liftedAt ? "Lifted" : isActive ? "Active" : "Expired"}
        </p>
      </section>

      {isActive ? <LiftBanForm banId={ban.id} /> : null}
    </div>
  );
}
