import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { requireAdminPermission } from "@/lib/admin/auth";
import { searchModerationLogs } from "@/lib/admin/log-queries";
import { formatModerationActionLabel } from "@/lib/admin/copy";
import {
  formatLogDetailsForDisplay,
  parseLogDetails,
} from "@/lib/moderation-log";

export const metadata: Metadata = { title: "Logs · Admin" };

type Props = {
  searchParams: Promise<{ action?: string; page?: string }>;
};

export default async function AdminLogsPage({ searchParams }: Props) {
  await requireAdminPermission("admin.logs.view");
  const params = await searchParams;
  const result = await searchModerationLogs({
    action: params.action,
    page: Number.parseInt(params.page ?? "1", 10) || 1,
  });

  const filterParams: Record<string, string> = params.action
    ? { action: params.action }
    : {};

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Logs"
        description="A record of what staff have done on the site."
      />

      <form className="bg-white border border-border rounded-2xl shadow-warm p-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <FieldLabel>What happened</FieldLabel>
          <select name="action" defaultValue={params.action ?? ""} className="form-field mt-1">
            <option value="">Everything</option>
            {result.actions.map((action) => (
              <option key={action} value={action}>
                {formatModerationActionLabel(action)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="min-h-11 px-5 font-bold rounded-xl bg-gradient-orange text-white">Filter</button>
      </form>

      <div className="bg-white border border-border rounded-2xl shadow-warm divide-y divide-border/60">
        {result.logs.map((log) => {
          const details = parseLogDetails(log.details);
          const detailLines = formatLogDetailsForDisplay(log.action, details);

          return (
            <div key={log.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-text-dark">
                  {formatModerationActionLabel(log.action)}
                </span>
                <span className="text-xs text-text-muted">{log.createdAt.toLocaleString()}</span>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                {log.actor ? (
                  <Link href={`/admin/users/${log.actor.id}`} className="text-accent font-semibold">{log.actor.username}</Link>
                ) : (
                  "System"
                )}
                {log.targetUser ? (
                  <> → <Link href={`/admin/users/${log.targetUser.id}`} className="text-accent font-semibold">{log.targetUser.username}</Link></>
                ) : null}
              </p>
              {detailLines.length > 0 ? (
                <dl className="mt-3 space-y-2 rounded-xl border border-border bg-cream/60 px-4 py-3">
                  {detailLines.map((line) => (
                    <div key={`${log.id}-${line.label}`} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3">
                      <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                        {line.label}
                      </dt>
                      <dd className="text-sm text-text-dark break-words">{line.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>

      <AdminPagination page={result.page} totalPages={result.totalPages} basePath="/admin/logs" searchParams={filterParams} />
    </div>
  );
}
