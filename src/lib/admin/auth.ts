export {
  requireAdminPermission,
  requireAnyAdminPermission,
} from "@/lib/auth";

import { hasEveryPermission } from "@/lib/permissions";
import { getAllRequiredPermissions } from "@/lib/permissions/requirements";

export async function assertAdminPermission(
  userId: string,
  permissionKey: string
): Promise<{ success: true } | { success: false; error: string }> {
  const requiredKeys = [permissionKey, ...getAllRequiredPermissions(permissionKey)];
  const allowed = await hasEveryPermission(userId, requiredKeys);
  if (!allowed) {
    return { success: false, error: "You do not have permission to perform this action." };
  }
  return { success: true };
}
