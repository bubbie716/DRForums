"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminRoleBadge } from "@/components/admin/AdminRoleBadge";
import { moveRoleOrder } from "@/lib/admin/role-actions";
import { cn } from "@/lib/utils";

type AdminRole = {
  id: string;
  name: string;
  color: string | null;
  isSystem: boolean;
  isDefault: boolean;
  userCount: number;
  permissionCount: number;
};

type RoleManagementListProps = {
  roles: AdminRole[];
};

function ActionButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-9 px-3 py-2 text-xs font-semibold rounded-lg border border-border text-text-dark hover:bg-hover transition-colors disabled:opacity-60"
      )}
    >
      {children}
    </button>
  );
}

export function RoleManagementList({ roles }: RoleManagementListProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function runAction(
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    setError("");
    setPendingKey(key);

    const result = await action();

    if (!result.success) {
      setError(result.error ?? "Action failed.");
      setPendingKey(null);
      return;
    }

    setPendingKey(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      ) : null}

      <div className="bg-cream border border-border rounded-2xl px-4 py-4 md:px-5 md:py-5 text-sm text-text-secondary leading-relaxed">
        <span className="font-bold text-text-dark">How ranking works:</span> Roles
        at the top outrank roles below. Use Move Up and Move Down to change where a
        role sits. The highest-ranked role shows on profiles when someone has
        multiple roles.
      </div>

      <div className="bg-white border border-border rounded-2xl shadow-warm overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border bg-cream/50 text-left">
              <th className="px-5 py-3 font-bold text-text-secondary">Role</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Users</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Abilities</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Notes</th>
              <th className="px-5 py-3 font-bold text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {roles.map((role, roleIndex) => (
              <tr key={role.id} className="hover:bg-hover/50">
                <td className="px-5 py-3">
                  <AdminRoleBadge role={role.name} color={role.color} />
                </td>
                <td className="px-5 py-3">{role.userCount}</td>
                <td className="px-5 py-3">{role.permissionCount}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {role.isSystem ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow/40 text-accent">
                        Built-in
                      </span>
                    ) : null}
                    {role.isDefault ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                        Default
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      onClick={() =>
                        runAction(`role-up-${role.id}`, () =>
                          moveRoleOrder(role.id, "up")
                        )
                      }
                      disabled={pendingKey !== null || roleIndex === 0}
                    >
                      Move Up
                    </ActionButton>
                    <ActionButton
                      onClick={() =>
                        runAction(`role-down-${role.id}`, () =>
                          moveRoleOrder(role.id, "down")
                        )
                      }
                      disabled={
                        pendingKey !== null || roleIndex === roles.length - 1
                      }
                    >
                      Move Down
                    </ActionButton>
                    <Link
                      href={`/admin/roles/${role.id}/edit`}
                      className="min-h-9 inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg border border-border text-accent hover:bg-hover transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
