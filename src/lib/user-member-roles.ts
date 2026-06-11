import { prisma } from "@/lib/prisma";
import { clearPermissionCache } from "@/lib/permissions";
import {
  isStaffRoleSlug,
  SYSTEM_ROLE_SLUGS,
} from "@/lib/system-roles";

export async function syncMemberRoleForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
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
    return;
  }

  const hasStaffRole = user.userRoles.some((assignment) =>
    isStaffRoleSlug(assignment.role.slug)
  );
  if (hasStaffRole) {
    return;
  }

  const hasCitizenRole = user.userRoles.some(
    (assignment) => assignment.role.slug === SYSTEM_ROLE_SLUGS.CITIZEN
  );

  const [touristRole, citizenRole] = await Promise.all([
    prisma.appRole.findUnique({
      where: { slug: SYSTEM_ROLE_SLUGS.TOURIST },
      select: { id: true },
    }),
    prisma.appRole.findUnique({
      where: { slug: SYSTEM_ROLE_SLUGS.CITIZEN },
      select: { id: true },
    }),
  ]);

  if (!touristRole || !citizenRole) {
    return;
  }

  if (hasCitizenRole) {
    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: touristRole.id,
      },
    });
    clearPermissionCache(userId);
    return;
  }

  const isVerified = Boolean(user.minecraftUuid);
  const targetRoleId = isVerified ? citizenRole.id : touristRole.id;
  const removeRoleId = isVerified ? touristRole.id : citizenRole.id;

  await prisma.$transaction([
    prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: removeRoleId,
      },
    }),
    prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: targetRoleId,
        },
      },
      create: {
        userId,
        roleId: targetRoleId,
      },
      update: {},
    }),
  ]);

  clearPermissionCache(userId);
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

  const [touristRole, citizenRole] = await Promise.all([
    prisma.appRole.findUnique({
      where: { slug: SYSTEM_ROLE_SLUGS.TOURIST },
      select: { id: true },
    }),
    prisma.appRole.findUnique({
      where: { slug: SYSTEM_ROLE_SLUGS.CITIZEN },
      select: { id: true },
    }),
  ]);

  if (!touristRole || !citizenRole) {
    return;
  }

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
