export const ADMIN_PANEL_ENTRY = "admin.dashboard.view";

/**
 * Permissions that only work inside the admin panel and what they need.
 * Forum/DM/profile permissions are intentionally excluded — they apply on the public site.
 */
export const PERMISSION_REQUIRES: Record<string, string[]> = {
  "admin.settings.manage": [ADMIN_PANEL_ENTRY],
  "admin.maintenance.manage": [ADMIN_PANEL_ENTRY],
  "admin.forums.manage": [ADMIN_PANEL_ENTRY],
  "admin.logs.view": [ADMIN_PANEL_ENTRY],
  "admin.roles.manage": [ADMIN_PANEL_ENTRY],
  "user.view": [ADMIN_PANEL_ENTRY],
  "user.edit": [ADMIN_PANEL_ENTRY, "user.view"],
  "user.ban": [ADMIN_PANEL_ENTRY, "user.view"],
  "user.unban": [ADMIN_PANEL_ENTRY, "user.view"],
  "user.changeRole": [ADMIN_PANEL_ENTRY, "user.view"],
  "user.unlinkMinecraft": [ADMIN_PANEL_ENTRY, "user.view"],
  "user.resetPassword": [ADMIN_PANEL_ENTRY, "user.view"],
  "user.resetProfile": [ADMIN_PANEL_ENTRY, "user.view"],
};

export function getPermissionRequirements(permissionKey: string): string[] {
  return PERMISSION_REQUIRES[permissionKey] ?? [];
}

export function getAllRequiredPermissions(
  permissionKey: string,
  visited = new Set<string>()
): string[] {
  const required: string[] = [];

  for (const requirement of getPermissionRequirements(permissionKey)) {
    if (visited.has(requirement)) {
      continue;
    }

    visited.add(requirement);
    required.push(requirement, ...getAllRequiredPermissions(requirement, visited));
  }

  return required;
}

export function getAllDependentPermissions(
  permissionKey: string,
  visited = new Set<string>()
): string[] {
  const dependents: string[] = [];

  for (const [dependentKey, requirements] of Object.entries(PERMISSION_REQUIRES)) {
    if (!requirements.includes(permissionKey) || visited.has(dependentKey)) {
      continue;
    }

    visited.add(dependentKey);
    dependents.push(
      dependentKey,
      ...getAllDependentPermissions(dependentKey, visited)
    );
  }

  return dependents;
}

export function expandPermissionKeys(keys: Iterable<string>): Set<string> {
  const expanded = new Set(keys);

  for (const key of keys) {
    for (const requirement of getAllRequiredPermissions(key)) {
      expanded.add(requirement);
    }
  }

  return expanded;
}

export function validatePermissionKeys(
  keys: Iterable<string>
): { valid: true } | { valid: false; error: string } {
  const selected = new Set(keys);

  for (const key of selected) {
    for (const requirement of getPermissionRequirements(key)) {
      if (!selected.has(requirement)) {
        return {
          valid: false,
          error: `"${key}" requires "${requirement}" to be enabled as well.`,
        };
      }
    }
  }

  return { valid: true };
}

export const ADMIN_NAV_PERMISSIONS: Record<string, string> = {
  "/admin": "admin.dashboard.view",
  "/admin/users": "user.view",
  "/admin/bans": "user.ban",
  "/admin/roles": "admin.roles.manage",
  "/admin/forums": "admin.forums.manage",
  "/admin/forms": "form.viewResponses",
  "/admin/maintenance": "admin.maintenance.manage",
  "/admin/settings": "admin.settings.manage",
  "/admin/logs": "admin.logs.view",
};

const ADMIN_NAV_ALTERNATE_PERMISSIONS: Record<string, string[]> = {
  "/admin/forms": ["form.create", "form.edit", "form.manageResponses"],
};

export function canAccessAdminNavItem(
  permissions: Iterable<string>,
  href: string
): boolean {
  const permissionSet = new Set(permissions);
  const required = ADMIN_NAV_PERMISSIONS[href];
  if (!required) {
    return false;
  }

  const hasPrimary = [required, ...getAllRequiredPermissions(required)].every(
    (key) => permissionSet.has(key)
  );
  if (hasPrimary) {
    return true;
  }

  const alternates = ADMIN_NAV_ALTERNATE_PERMISSIONS[href] ?? [];
  return alternates.some((key) => permissionSet.has(key));
}
