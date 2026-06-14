import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clearPermissionCache } from "@/lib/permissions";
import {
  isStaffRoleSlug,
  SYSTEM_ROLE_SLUGS,
} from "@/lib/system-roles";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type MemberRoleSyncResult = {
  assignedRoleSlug: typeof SYSTEM_ROLE_SLUGS.CITIZEN | typeof SYSTEM_ROLE_SLUGS.TOURIST | null;
  promotedToCitizen: boolean;
};

async function getMemberRoleIds(db: DbClient) {
  const [touristRole, citizenRole] = await Promise.all([
    db.appRole.findUnique({
      where: { slug: SYSTEM_ROLE_SLUGS.TOURIST },
      select: { id: true, name: true },
    }),
    db.appRole.findUnique({
      where: { slug: SYSTEM_ROLE_SLUGS.CITIZEN },
      select: { id: true, name: true },
    }),
  ]);

  if (!touristRole || !citizenRole) {
    return null;
  }

  return { touristRole, citizenRole };
}

async function applyMemberRoleSync(
  userId: string,
  db: DbClient = prisma
): Promise<MemberRoleSyncResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      minecraftUuid: true,
      userRoles: {
        include: {
          role: {
            select: { slug: true },
          },
        },
      },
    },
  });

  if (!user) {
    return { assignedRoleSlug: null, promotedToCitizen: false };
  }

  const hasStaffRole = user.userRoles.some((assignment) =>
    isStaffRoleSlug(assignment.role.slug)
  );
  if (hasStaffRole) {
    return { assignedRoleSlug: null, promotedToCitizen: false };
  }

  const memberRoles = await getMemberRoleIds(db);
  if (!memberRoles) {
    return { assignedRoleSlug: null, promotedToCitizen: false };
  }

  const { touristRole, citizenRole } = memberRoles;
  const hasCitizenRole = user.userRoles.some(
    (assignment) => assignment.role.slug === SYSTEM_ROLE_SLUGS.CITIZEN
  );

  if (hasCitizenRole) {
    await db.userRole.deleteMany({
      where: {
        userId,
        roleId: touristRole.id,
      },
    });
    return {
      assignedRoleSlug: SYSTEM_ROLE_SLUGS.CITIZEN,
      promotedToCitizen: false,
    };
  }

  const isVerified = Boolean(user.minecraftUuid);
  const targetRole = isVerified ? citizenRole : touristRole;
  const removeRoleId = isVerified ? touristRole.id : citizenRole.id;

  await db.userRole.deleteMany({
    where: {
      userId,
      roleId: removeRoleId,
    },
  });
  await db.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId: targetRole.id,
      },
    },
    create: {
      userId,
      roleId: targetRole.id,
    },
    update: {},
  });

  return {
    assignedRoleSlug: isVerified
      ? SYSTEM_ROLE_SLUGS.CITIZEN
      : SYSTEM_ROLE_SLUGS.TOURIST,
    promotedToCitizen: isVerified,
  };
}

/** Promotes a non-staff member to Citizen when they link Minecraft. */
export async function assignCitizenRoleOnMinecraftLink(
  userId: string,
  db: DbClient = prisma
): Promise<MemberRoleSyncResult> {
  return applyMemberRoleSync(userId, db);
}

export async function syncMemberRoleForUser(userId: string): Promise<MemberRoleSyncResult> {
  const result = await applyMemberRoleSync(userId);
  if (result.assignedRoleSlug) {
    clearPermissionCache(userId);
  }
  return result;
}

export async function demoteMemberToTouristAfterMinecraftUnlink(
  userId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRoles: {
        include: {
          role: {
            select: { slug: true },
          },
        },
      },
    },
  });

  if (!user) {
    return;
  }

  const hasStaffRole = user.userRoles.some((assignment) =>
    isStaffRoleSlug(assignment.role.slug)
  );
  if (hasStaffRole) {
    return;
  }

  const memberRoles = await getMemberRoleIds(prisma);
  if (!memberRoles) {
    return;
  }

  const { touristRole, citizenRole } = memberRoles;

  await prisma.$transaction([
    prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: citizenRole.id,
      },
    }),
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: touristRole.id,
        },
      },
      create: {
        userId,
        roleId: touristRole.id,
      },
      update: {},
    }),
  ]);

  clearPermissionCache(userId);
}

export async function syncUserRolesAfterChange(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRoles: {
        include: {
          role: {
            select: { slug: true },
          },
        },
      },
    },
  });

  if (!user) {
    return;
  }

  const hasStaffRole = user.userRoles.some((assignment) =>
    isStaffRoleSlug(assignment.role.slug)
  );

  if (hasStaffRole) {
    await prisma.userRole.deleteMany({
      where: {
        userId,
        role: {
          slug: {
            in: [SYSTEM_ROLE_SLUGS.TOURIST, SYSTEM_ROLE_SLUGS.CITIZEN],
          },
        },
      },
    });
    clearPermissionCache(userId);
    return;
  }

  await syncMemberRoleForUser(userId);
}
