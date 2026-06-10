"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ForumRoleAccessRow } from "@/lib/admin/forum-role-permission-queries";
import {
  applyCategoryRoleAccessPreset,
  applyForumRoleAccessPreset,
  updateCategoryRolePermissions,
  updateForumRolePermissions,
  type ForumRolePermissionInput,
} from "@/lib/admin/forum-role-permission-actions";
import {
  FORUM_ACCESS_PRESETS,
  type ForumAccessFlags,
  type ForumAccessPresetId,
} from "@/lib/forum-access-presets";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";

type ForumRoleAccessSectionProps = {
  scope: "category" | "forum";
  targetId: string;
  initialRows: ForumRoleAccessRow[];
};

type RowState = ForumRolePermissionInput & {
  roleName: string;
  roleSlug: string;
  roleColor: string | null;
  isAdminRole: boolean;
};

const COLUMNS: Array<{ key: keyof ForumAccessFlags; label: string }> = [
  { key: "canView", label: "Show in list" },
  { key: "canRead", label: "Open & read" },
  { key: "canCreateThreads", label: "New threads" },
  { key: "canReply", label: "Reply" },
  { key: "canViewOtherThreads", label: "See all posts" },
  { key: "canModerate", label: "Mod tools" },
];

function normalizeRowValues(values: ForumAccessFlags): ForumAccessFlags {
  if (!values.canView) {
    return {
      canView: false,
      canRead: false,
      canCreateThreads: false,
      canReply: false,
      canViewOtherThreads: false,
      canModerate: false,
    };
  }

  if (!values.canRead) {
    return {
      ...values,
      canCreateThreads: false,
      canReply: false,
    };
  }

  return values;
}

export function ForumRoleAccessSection({
  scope,
  targetId,
  initialRows,
}: ForumRoleAccessSectionProps) {
  const router = useRouter();
  const [rows, setRows] = useState<RowState[]>(() =>
    initialRows.map((row) => ({
      roleId: row.roleId,
      roleName: row.roleName,
      roleSlug: row.roleSlug,
      roleColor: row.roleColor,
      isAdminRole: row.isAdminRole,
      canView: row.canView,
      canRead: row.canRead,
      canCreateThreads: row.canCreateThreads,
      canReply: row.canReply,
      canViewOtherThreads: row.canViewOtherThreads,
      canModerate: row.canModerate,
    }))
  );

  useEffect(() => {
    setRows(
      initialRows.map((row) => ({
        roleId: row.roleId,
        roleName: row.roleName,
        roleSlug: row.roleSlug,
        roleColor: row.roleColor,
        isAdminRole: row.isAdminRole,
        canView: row.canView,
        canRead: row.canRead,
        canCreateThreads: row.canCreateThreads,
        canReply: row.canReply,
        canViewOtherThreads: row.canViewOtherThreads,
        canModerate: row.canModerate,
      }))
    );
  }, [initialRows]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);

  const scopeLabel = scope === "category" ? "category" : "subcategory";

  const permissionsPayload = useMemo(
    () =>
      rows
        .filter((row) => !row.isAdminRole)
        .map((row) => ({
          roleId: row.roleId,
          ...normalizeRowValues({
            canView: row.canView,
            canRead: row.canRead,
            canCreateThreads: row.canCreateThreads,
            canReply: row.canReply,
            canViewOtherThreads: row.canViewOtherThreads,
            canModerate: row.canModerate,
          }),
        })),
    [rows]
  );

  function updateRow(
    roleId: string,
    key: keyof ForumAccessFlags,
    value: boolean
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.roleId !== roleId || row.isAdminRole) {
          return row;
        }

        const next = normalizeRowValues({
          canView: row.canView,
          canRead: row.canRead,
          canCreateThreads: row.canCreateThreads,
          canReply: row.canReply,
          canViewOtherThreads: row.canViewOtherThreads,
          canModerate: row.canModerate,
          [key]: value,
        });

        return {
          ...row,
          ...next,
        };
      })
    );
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    setSaving(true);

    const result =
      scope === "category"
        ? await updateCategoryRolePermissions(targetId, permissionsPayload)
        : await updateForumRolePermissions(targetId, permissionsPayload);

    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSuccess("Access rules saved.");
    setSaving(false);
    router.refresh();
  }

  async function handlePresetChange(presetId: string) {
    if (!presetId) {
      return;
    }

    setError("");
    setSuccess("");
    setApplyingPreset(true);

    const result =
      scope === "category"
        ? await applyCategoryRoleAccessPreset(
            targetId,
            presetId as ForumAccessPresetId
          )
        : await applyForumRoleAccessPreset(
            targetId,
            presetId as ForumAccessPresetId
          );

    if (!result.success) {
      setError(result.error);
      setApplyingPreset(false);
      return;
    }

    setSuccess("Quick setup applied.");
    setApplyingPreset(false);
    router.refresh();
  }

  return (
    <section
      id="access"
      className="bg-white border border-border rounded-2xl shadow-warm p-4 md:p-6 lg:p-8 space-y-6 scroll-mt-8"
    >
      <div>
        <h2 className="text-xl font-extrabold text-text-dark">Who can access this</h2>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          Choose what each role can do in this {scopeLabel}.
          {scope === "category"
            ? " These settings apply to all subcategories unless overridden at the subcategory level."
            : " Subcategory settings override the parent category for this board."}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm"
        >
          {success}
        </div>
      )}

      <div className="space-y-2">
        <FieldLabel>Quick setup</FieldLabel>
        <select
          defaultValue=""
          disabled={applyingPreset || saving}
          onChange={(event) => {
            const value = event.target.value;
            event.target.value = "";
            if (value) {
              void handlePresetChange(value);
            }
          }}
          className={formInputClassName}
        >
          <option value="">Pick a starting point…</option>
          {FORUM_ACCESS_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-text-secondary">
          Updates every role except Admin. Admins always have full access.
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-3">Role</th>
              {COLUMNS.map((column) => (
                <th key={column.key} className="px-3 py-3 text-center whitespace-nowrap">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.roleId} className="border-b border-border/70">
                <td className="px-4 py-3 font-semibold text-text-dark whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-2"
                    style={row.roleColor ? { color: row.roleColor } : undefined}
                  >
                    {row.roleName}
                    {row.isAdminRole && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                        Full access
                      </span>
                    )}
                  </span>
                </td>
                {COLUMNS.map((column) => (
                  <td key={column.key} className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row[column.key]}
                      disabled={row.isAdminRole || saving || applyingPreset}
                      onChange={(event) =>
                        updateRow(row.roleId, column.key, event.target.checked)
                      }
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent/20 disabled:opacity-60"
                      aria-label={`${row.roleName} — ${column.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || applyingPreset}
          className="min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all duration-200 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save access rules"}
        </button>
      </div>
    </section>
  );
}
