import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasEveryPermission } from "@/lib/permissions";
import { getAllRequiredPermissions } from "@/lib/permissions/requirements";

export {
  requireAdminPermission,
  requireAnyAdminPermission,
} from "@/lib/auth";

async function userHasLegacyAdminRole(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user ? isAdmin(user.role) : false;
}

// TODO: Migrate legacy ADMIN accounts to explicit UserRole permission assignments.
export async function assertAdminPermission(
  userId: string,
  permissionKey: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (await userHasLegacyAdminRole(userId)) {
    return { success: true };
  }

  const requiredKeys = [permissionKey, ...getAllRequiredPermissions(permissionKey)];
  const allowed = await hasEveryPermission(userId, requiredKeys);
  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to perform this action.",
    };
  }

  return { success: true };
}
