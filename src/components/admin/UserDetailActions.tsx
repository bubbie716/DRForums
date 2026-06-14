"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import {
  adminAssignRole,
  adminRemoveRole,
  adminResetUserPassword,
  adminResetUserProfile,
  adminUnlinkMinecraft,
} from "@/lib/admin/user-actions";
import { adminBanUserFromDetail } from "@/lib/admin/ban-actions";
import { FORUM_BAN_SCOPE_NOTE } from "@/lib/ban-copy";

type RoleOption = { id: string; name: string; slug: string; priority: number };

type UserDetailActionsProps = {
  userId: string;
  username: string;
  isSelf: boolean;
  assignedRoleIds: string[];
  allRoles: RoleOption[];
  hasActiveBan: boolean;
  actorPermissions: string[];
};

export function UserDetailActions({
  userId,
  username,
  isSelf,
  assignedRoleIds,
  allRoles,
  hasActiveBan,
  actorPermissions,
}: UserDetailActionsProps) {
  const router = useRouter();
  const permissionSet = new Set(actorPermissions);
  const can = (permission: string) => permissionSet.has(permission);
  const canManageRoles = can("user.changeRole");
  const hasStaffActions =
    can("user.resetPassword") ||
    can("user.resetProfile") ||
    can("user.unlinkMinecraft") ||
    can("user.ban") ||
    canManageRoles;
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [modal, setModal] = useState<"password" | "profile" | "minecraft" | "ban" | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  async function runAction(action: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    setLoading(true);
    const result = await action();
    setLoading(false);
    if (!result.success) {
      setNotice({ type: "error", message: result.error ?? "Action failed." });
      return;
    }
    setNotice({ type: "success", message: result.message ?? "Done." });
    setModal(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <AdminNotice type={notice.type} message={notice.message} onDismiss={() => setNotice(null)} />
      ) : null}

      {hasStaffActions ? (
        <div className="bg-white border border-border rounded-2xl shadow-warm p-5 space-y-4">
          <h3 className="font-bold text-text-dark">Staff actions</h3>

          <div className="flex flex-wrap gap-3">
            {can("user.resetPassword") ? (
              <button
                type="button"
                onClick={() => setModal("password")}
                className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-hover"
              >
                Reset Password
              </button>
            ) : null}
            {can("user.resetProfile") ? (
              <button
                type="button"
                onClick={() => setModal("profile")}
                className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-hover"
              >
                Reset Profile
              </button>
            ) : null}
            {can("user.unlinkMinecraft") ? (
              <button
                type="button"
                onClick={() => setModal("minecraft")}
                className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-hover"
              >
                Unlink Minecraft
              </button>
            ) : null}
            {can("user.ban") && !hasActiveBan ? (
              <button
                type="button"
                onClick={() => setModal("ban")}
                className="min-h-10 px-4 py-2 text-sm font-bold rounded-xl border border-red-200 text-red-700 hover:bg-red-50"
              >
                Forum Ban
              </button>
            ) : null}
          </div>

          {canManageRoles ? (
            <div className="pt-4 border-t border-border">
              <FieldLabel className="mb-2">Assign role</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="form-field min-w-[180px]"
                >
                  <option value="">Select role…</option>
                  {allRoles
                    .filter((r) => !assignedRoleIds.includes(r.id))
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedRoleId || loading}
                  onClick={() => runAction(() => adminAssignRole(userId, selectedRoleId))}
                  className="min-h-10 px-4 py-2 text-sm font-bold rounded-xl bg-gradient-orange text-white disabled:opacity-60"
                >
                  Assign
                </button>
              </div>
              {assignedRoleIds.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {allRoles
                    .filter((r) => assignedRoleIds.includes(r.id))
                    .map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        disabled={loading}
                        onClick={() => runAction(() => adminRemoveRole(userId, role.id))}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-yellow/30 border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
                      >
                        Remove {role.name} ×
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <AdminConfirmModal
        open={modal === "password"}
        title="Reset Password"
        message={
          isSelf
            ? `Reset YOUR password to changeme123? You will need to log in again immediately.`
            : `Reset ${username}'s password to changeme123? Tell them to log in and change it immediately.`
        }
        confirmLabel="Reset Password"
        variant="danger"
        loading={loading}
        onCancel={() => setModal(null)}
        onConfirm={() => runAction(() => adminResetUserPassword(userId))}
      />

      <AdminConfirmModal
        open={modal === "profile"}
        title="Reset Public Profile"
        message={`Clear ${username}'s bio, avatar, banner, and signature to defaults? Minecraft account will not be unlinked.`}
        confirmLabel="Reset Profile"
        loading={loading}
        onCancel={() => setModal(null)}
        onConfirm={() => runAction(() => adminResetUserProfile(userId))}
      />

      <AdminConfirmModal
        open={modal === "minecraft"}
        title="Unlink Minecraft"
        message={`Unlink ${username}'s Minecraft account? They will need to verify again before posting.`}
        confirmLabel="Unlink"
        variant="danger"
        loading={loading}
        onCancel={() => setModal(null)}
        onConfirm={() => runAction(() => adminUnlinkMinecraft(userId))}
      />

      {modal === "ban" ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-text-dark/40" onClick={() => setModal(null)} aria-label="Close" />
          <form
            className="relative w-full max-w-lg bg-white border border-border rounded-2xl shadow-warm-lg p-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              const fd = new FormData(e.currentTarget);
              const result = await adminBanUserFromDetail(userId, fd);
              setLoading(false);
              if (!result.success) {
                setNotice({ type: "error", message: result.error ?? "Ban failed." });
                return;
              }
              setNotice({ type: "success", message: result.message ?? "User banned." });
              setModal(null);
              router.refresh();
            }}
          >
            <h2 className="text-lg font-extrabold text-text-dark">Forum ban: {username}</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{FORUM_BAN_SCOPE_NOTE}</p>
            <div>
              <FieldLabel>Forum ban reason</FieldLabel>
              <AutoResizeTextarea name="reason" required rows={3} className="form-field mt-1" placeholder="Reason shown to the user on the website" />
            </div>
            <div>
              <FieldLabel>Internal note (optional)</FieldLabel>
              <AutoResizeTextarea name="internalNote" rows={2} className="form-field mt-1" placeholder="Staff-only note" />
            </div>
            <div>
              <FieldLabel>Duration</FieldLabel>
              <select name="duration" className="form-field mt-1" defaultValue="7d">
                <option value="permanent">Permanent</option>
                <option value="1d">1 day</option>
                <option value="3d">3 days</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="custom">Custom date</option>
              </select>
            </div>
            <div>
              <FieldLabel>End date & time</FieldLabel>
              <input type="datetime-local" name="customExpiresAt" className="form-field mt-1" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="min-h-10 px-4 rounded-xl border border-border">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="min-h-10 px-4 rounded-xl bg-red-600 text-white font-bold disabled:opacity-60">
                {loading ? "Banning…" : "Apply Forum Ban"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
