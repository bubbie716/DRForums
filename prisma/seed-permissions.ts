import { PrismaClient, Role } from "@prisma/client";
import {
  SYSTEM_ROLE_DEFINITIONS,
  SYSTEM_ROLE_PERMISSIONS,
  SYSTEM_ROLE_SLUGS,
  isStaffRoleSlug,
} from "@/lib/system-roles";

const PERMISSION_DEFINITIONS = [
  { key: "forum.thread.create", label: "Create threads", category: "Forum" },
  { key: "forum.thread.reply", label: "Reply to threads", category: "Forum" },
  { key: "forum.thread.editOwn", label: "Edit own threads", category: "Forum" },
  { key: "forum.thread.deleteOwn", label: "Delete own threads", category: "Forum" },
  { key: "forum.thread.lock", label: "Lock threads", category: "Forum" },
  { key: "forum.thread.pin", label: "Pin threads", category: "Forum" },
  { key: "forum.thread.move", label: "Move threads", category: "Forum" },
  { key: "forum.post.editAny", label: "Edit any post", category: "Forum" },
  { key: "forum.post.deleteAny", label: "Delete any post", category: "Forum" },
  { key: "dm.send", label: "Send direct messages", category: "Direct Messages" },
  { key: "dm.read", label: "Read direct messages", category: "Direct Messages" },
  { key: "dm.deleteOwn", label: "Delete own messages", category: "Direct Messages" },
  { key: "user.view", label: "View users", category: "Users" },
  { key: "user.edit", label: "Edit users", category: "Users" },
  { key: "user.ban", label: "Ban users", category: "Users" },
  { key: "user.unban", label: "Unban users", category: "Users" },
  { key: "user.changeRole", label: "Change user roles", category: "Users" },
  { key: "user.unlinkMinecraft", label: "Unlink Minecraft accounts", category: "Users" },
  { key: "user.resetPassword", label: "Reset user passwords", category: "Users" },
  { key: "user.resetProfile", label: "Reset public profiles", category: "Users" },
  { key: "profile.editOwn", label: "Edit own profile", category: "Profiles" },
  { key: "profile.customAvatar", label: "Custom avatar", category: "Profiles" },
  { key: "profile.customBanner", label: "Custom banner", category: "Profiles" },
  { key: "profile.customDescription", label: "Custom bio", category: "Profiles" },
  { key: "admin.dashboard.view", label: "View admin dashboard", category: "Admin" },
  { key: "admin.settings.manage", label: "Manage site settings", category: "Admin" },
  { key: "admin.maintenance.manage", label: "Manage maintenance mode", category: "Admin" },
  { key: "admin.forums.manage", label: "Manage forums", category: "Admin" },
  { key: "admin.logs.view", label: "View moderation logs", category: "Admin" },
  { key: "admin.roles.manage", label: "Manage roles & permissions", category: "Admin" },
  { key: "poll.create", label: "Create polls (future)", category: "Future — Polls" },
  { key: "poll.vote", label: "Vote in polls (future)", category: "Future — Polls" },
  { key: "poll.closeAny", label: "Close any poll (future)", category: "Future — Polls" },
  { key: "form.create", label: "Create forms (future)", category: "Future — Forms" },
  { key: "form.respond", label: "Respond to forms (future)", category: "Future — Forms" },
  { key: "form.viewResponses", label: "View form responses (future)", category: "Future — Forms" },
  { key: "form.manage", label: "Manage forms (future)", category: "Future — Forms" },
];

const SITE_DEFAULTS: Record<string, string> = {
  siteName: "District Roleplay",
  siteTagline: "Community Forum",
  registrationEnabled: "true",
  dmsEnabled: "true",
  maxProfileBioLength: "500",
  allowCustomProfilePictures: "false",
  allowCustomBanners: "false",
  maintenanceMode: "false",
  maintenanceMessage: "District Roleplay is currently undergoing maintenance. Please check back soon.",
  pollsEnabled: "false",
  formsEnabled: "false",
  markdownEnabled: "false",
  bbcodeEnabled: "false",
};

const LEGACY_ROLE_SLUGS = ["admin", "user"];
const VALID_SYSTEM_SLUGS = SYSTEM_ROLE_DEFINITIONS.map((role) => role.slug);

async function cleanupOrphanSystemRoles(prisma: PrismaClient) {
  const orphans = await prisma.appRole.findMany({
    where: {
      OR: [
        { slug: { in: LEGACY_ROLE_SLUGS } },
        { slug: "" },
        {
          isSystem: true,
          slug: { notIn: VALID_SYSTEM_SLUGS },
        },
      ],
    },
    select: { id: true },
  });

  for (const orphan of orphans) {
    await prisma.userRole.deleteMany({ where: { roleId: orphan.id } });
    await prisma.rolePermission.deleteMany({ where: { roleId: orphan.id } });
    await prisma.forumRolePermission.deleteMany({ where: { roleId: orphan.id } });
    await prisma.appRole.delete({ where: { id: orphan.id } });
  }
}

async function migrateLegacyRoles(prisma: PrismaClient) {
  const legacyRoles = await prisma.appRole.findMany({
    where: { slug: { in: LEGACY_ROLE_SLUGS } },
    include: {
      users: {
        include: {
          user: {
            select: { id: true, minecraftUuid: true, username: true },
          },
        },
      },
    },
  });

  if (legacyRoles.length === 0) {
    return;
  }

  const roleMap = new Map(
    (await prisma.appRole.findMany({ select: { id: true, slug: true } })).map(
      (role) => [role.slug, role.id]
    )
  );

  for (const legacyRole of legacyRoles) {
    for (const assignment of legacyRole.users) {
      const user = assignment.user;
      let targetSlug: string;

      if (legacyRole.slug === "admin") {
        targetSlug =
          user.username === "admin"
            ? SYSTEM_ROLE_SLUGS.FOUNDER
            : SYSTEM_ROLE_SLUGS.SYSTEM_ADMINISTRATOR;
      } else {
        targetSlug = user.minecraftUuid
          ? SYSTEM_ROLE_SLUGS.CITIZEN
          : SYSTEM_ROLE_SLUGS.TOURIST;
      }

      const targetRoleId = roleMap.get(targetSlug);
      if (targetRoleId) {
        await prisma.userRole.upsert({
          where: {
            userId_roleId: { userId: user.id, roleId: targetRoleId },
          },
          create: { userId: user.id, roleId: targetRoleId },
          update: {},
        });
      }

      await prisma.userRole.deleteMany({
        where: {
          userId: user.id,
          roleId: legacyRole.id,
        },
      });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: legacyRole.id } });
    await prisma.forumRolePermission.deleteMany({ where: { roleId: legacyRole.id } });
    await prisma.appRole.delete({ where: { id: legacyRole.id } });
  }
}

async function syncMemberRolesForAllUsers(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      minecraftUuid: true,
      userRoles: {
        include: {
          role: { select: { slug: true } },
        },
      },
    },
  });

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

  for (const user of users) {
    const hasStaffRole = user.userRoles.some((assignment) =>
      isStaffRoleSlug(assignment.role.slug)
    );
    if (hasStaffRole) {
      await prisma.userRole.deleteMany({
        where: {
          userId: user.id,
          roleId: { in: [touristRole.id, citizenRole.id] },
        },
      });
      continue;
    }

    const isVerified = Boolean(user.minecraftUuid);
    const targetRoleId = isVerified ? citizenRole.id : touristRole.id;
    const removeRoleId = isVerified ? touristRole.id : citizenRole.id;

    await prisma.userRole.deleteMany({
      where: { userId: user.id, roleId: removeRoleId },
    });
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: user.id, roleId: targetRoleId },
      },
      create: { userId: user.id, roleId: targetRoleId },
      update: {},
    });
  }
}

export async function seedPermissionsRolesSettings(prisma: PrismaClient) {
  for (const def of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: def.key },
      create: { key: def.key, label: def.label, category: def.category },
      update: { label: def.label, category: def.category },
    });
  }

  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [p.key, p.id]));

  await prisma.appRole.updateMany({ data: { isDefault: false } });

  for (const roleDefinition of SYSTEM_ROLE_DEFINITIONS) {
    const role = await prisma.appRole.upsert({
      where: { slug: roleDefinition.slug },
      create: {
        name: roleDefinition.name,
        slug: roleDefinition.slug,
        description: roleDefinition.description,
        color: roleDefinition.color,
        priority: roleDefinition.priority,
        isDefault: roleDefinition.isDefault,
        isSystem: roleDefinition.isSystem,
      },
      update: {
        name: roleDefinition.name,
        description: roleDefinition.description,
        color: roleDefinition.color,
        priority: roleDefinition.priority,
        isDefault: roleDefinition.isDefault,
        isSystem: roleDefinition.isSystem,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const permissionKeys =
      SYSTEM_ROLE_PERMISSIONS[
        roleDefinition.slug as keyof typeof SYSTEM_ROLE_PERMISSIONS
      ] ?? [];

    for (const key of permissionKeys) {
      const permissionId = permMap.get(key);
      if (permissionId) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId },
        });
      }
    }
  }

  await migrateLegacyRoles(prisma);

  const roleMap = new Map(
    (await prisma.appRole.findMany({ select: { id: true, slug: true } })).map(
      (role) => [role.slug, role.id]
    )
  );

  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
      minecraftUuid: true,
      userRoles: { select: { roleId: true } },
    },
  });

  for (const user of users) {
    if (user.userRoles.length > 0) {
      continue;
    }

    let slug: string;
    if (user.role === Role.ADMIN) {
      slug = SYSTEM_ROLE_SLUGS.SYSTEM_ADMINISTRATOR;
    } else if (user.role === Role.MODERATOR) {
      slug = SYSTEM_ROLE_SLUGS.MODERATOR;
    } else {
      slug = user.minecraftUuid
        ? SYSTEM_ROLE_SLUGS.CITIZEN
        : SYSTEM_ROLE_SLUGS.TOURIST;
    }

    const roleId = roleMap.get(slug);
    if (!roleId) {
      continue;
    }

    await prisma.userRole.create({
      data: { userId: user.id, roleId },
    });
  }

  await syncMemberRolesForAllUsers(prisma);
  await cleanupOrphanSystemRoles(prisma);

  for (const [key, value] of Object.entries(SITE_DEFAULTS)) {
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}
