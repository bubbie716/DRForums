"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { FieldLabel } from "@/components/ui/FieldLabel";
import {
  adminCreateRole,
  adminDeleteRole,
  adminUpdateRole,
} from "@/lib/admin/role-actions";
import { PERMISSION_CATEGORY_LABELS } from "@/lib/admin/copy";
import {
  getAllDependentPermissions,
  getAllRequiredPermissions,
  getPermissionRequirements,
} from "@/lib/permissions/requirements";

type PermissionGroup = {
  category: string;
  permissions: { id: string; key: string; label: string; description: string | null }[];
};

type RoleFormProps = {
  mode: "create" | "edit";
  roleId?: string;
  initial?: {
    name: string;
    slug: string;
    description: string;
    color: string;
    isDefault: boolean;
    permissionIds: string[];
  };
  permissionGroups: PermissionGroup[];
  isSystem?: boolean;
  userCount?: number;
};

export function RoleForm({
  mode,
  roleId,
  initial,
  permissionGroups,
  isSystem,
  userCount = 0,
}: RoleFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.permissionIds ?? []));

  const { keyById, idByKey } = useMemo(() => {
    const keyByIdMap = new Map<string, string>();
    const idByKeyMap = new Map<string, string>();

    for (const group of permissionGroups) {
      for (const permission of group.permissions) {
        keyByIdMap.set(permission.id, permission.key);
        idByKeyMap.set(permission.key, permission.id);
      }
    }

    return { keyById: keyByIdMap, idByKey: idByKeyMap };
  }, [permissionGroups]);

  function togglePermission(id: string) {
    const key = keyById.get(id);
    if (!key) {
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
        for (const dependentKey of getAllDependentPermissions(key)) {
          const dependentId = idByKey.get(dependentKey);
          if (dependentId) {
            next.delete(dependentId);
          }
        }
      } else {
        next.add(id);
        for (const requiredKey of getAllRequiredPermissions(key)) {
          const requiredId = idByKey.get(requiredKey);
          if (requiredId) {
            next.add(requiredId);
          }
        }
      }

      return next;
    });
  }

  async function handleDelete() {
    if (mode !== "edit" || !roleId || isSystem) {
      return;
    }

    const memberNote =
      userCount > 0
        ? `\n\n${userCount} member${userCount === 1 ? "" : "s"} will be removed from this role.`
        : "";

    if (
      !window.confirm(
        `Delete role "${initial?.name ?? "this role"}"? This cannot be undone.${memberNote}`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setDeleting(true);

    const result = await adminDeleteRole(roleId);

    if (!result.success) {
      setError(result.error ?? "Delete failed.");
      setDeleting(false);
      return;
    }

    router.push(
      `/admin/roles?notice=${encodeURIComponent(result.message ?? "Role deleted.")}`
    );
    router.refresh();
  }

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        const input = {
          name: String(fd.get("name") ?? ""),
          slug: String(fd.get("slug") ?? ""),
          description: String(fd.get("description") ?? ""),
          color: String(fd.get("color") ?? ""),
          isDefault: fd.get("isDefault") === "on",
          permissionIds: Array.from(selected),
        };
        const result =
          mode === "create"
            ? await adminCreateRole(input)
            : await adminUpdateRole(roleId!, input);
        setLoading(false);
        if (!result.success) {
          setError(result.error ?? "Save failed.");
          return;
        }
        if (mode === "create") {
          router.push("/admin/roles");
          router.refresh();
          return;
        }
        setSuccess(result.message ?? "Role updated.");
        router.refresh();
      }}
    >
      {error ? <AdminNotice type="error" message={error} onDismiss={() => setError("")} /> : null}
      {success ? (
        <AdminNotice type="success" message={success} onDismiss={() => setSuccess("")} />
      ) : null}

      <div className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6 grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Role name</FieldLabel>
          <input name="name" required defaultValue={initial?.name} className="form-field mt-1" />
        </div>
        <div>
          <FieldLabel>Internal ID</FieldLabel>
          <input name="slug" required defaultValue={initial?.slug} disabled={isSystem} className="form-field mt-1 text-sm disabled:opacity-60" />
          <p className="text-xs text-text-secondary mt-1">
            Used by the site behind the scenes. Built-in roles cannot change this.
          </p>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Description</FieldLabel>
          <textarea name="description" rows={2} defaultValue={initial?.description} className="form-field mt-1" />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Badge color</FieldLabel>
          <input name="color" type="color" defaultValue={initial?.color || "#e29027"} className="form-field mt-1 h-11" />
        </div>
        <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer">
          <input name="isDefault" type="checkbox" defaultChecked={initial?.isDefault} className="w-4 h-4 accent-accent" />
          <span className="text-sm font-semibold">Default role for new users</span>
        </label>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">
        Admin panel permissions require{" "}
        <span className="font-semibold text-text-dark">View admin dashboard</span>.
        User management actions also require{" "}
        <span className="font-semibold text-text-dark">View users</span>. Required
        permissions are added automatically.
      </p>

      <div className="space-y-4">
        {permissionGroups.map((group) => (
          <section key={group.category} className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-cream/50">
              <h3 className="font-bold text-text-dark text-sm">
                {PERMISSION_CATEGORY_LABELS[group.category] ?? group.category}
              </h3>
            </div>
            <div className="p-4 grid gap-2 sm:grid-cols-2">
              {group.permissions.map((perm) => (
                <label key={perm.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-hover cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="mt-1 w-4 h-4 accent-accent"
                  />
                  <span>
                    <span className="text-sm font-semibold text-text-dark block">{perm.label}</span>
                    {perm.description ? (
                      <span className="text-xs text-text-secondary block mt-0.5">
                        {perm.description}
                      </span>
                    ) : null}
                    {getPermissionRequirements(perm.key).length > 0 ? (
                      <span className="text-xs text-text-muted block mt-0.5">
                        Requires:{" "}
                        {getPermissionRequirements(perm.key)
                          .map((requiredKey) => {
                            const requiredPermission = permissionGroups
                              .flatMap((group) => group.permissions)
                              .find((entry) => entry.key === requiredKey);
                            return requiredPermission?.label ?? requiredKey;
                          })
                          .join(", ")}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {mode === "edit" && !isSystem ? (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting || loading}
            className="min-h-11 px-5 py-3 text-sm font-bold rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete Role"}
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          disabled={loading || deleting}
          className="min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl disabled:opacity-60"
        >
          {loading ? "Saving…" : mode === "create" ? "Create Role" : "Save Role"}
        </button>
      </div>
    </form>
  );
}
