import { ALL_PERMISSION_KEYS } from "@/lib/permissions/definitions";

export const SYSTEM_ROLE_SLUGS = {
  FOUNDER: "founder",
  SYSTEM_ADMINISTRATOR: "system-administrator",
  MODERATOR: "moderator",
  CITIZEN: "citizen",
  TOURIST: "tourist",
} as const;

export type SystemRoleSlug =
  (typeof SYSTEM_ROLE_SLUGS)[keyof typeof SYSTEM_ROLE_SLUGS];

const CITIZEN_PERMISSIONS = [
  "forum.thread.create",
  "forum.thread.reply",
  "forum.thread.editOwn",
  "forum.thread.deleteOwn",
  "dm.send",
  "dm.read",
  "dm.deleteOwn",
  "profile.editOwn",
];

const TOURIST_PERMISSIONS = ["dm.read", "profile.editOwn"];

const MODERATOR_PERMISSIONS = [
  ...CITIZEN_PERMISSIONS,
  "forum.thread.lock",
  "forum.thread.pin",
  "admin.dashboard.view",
  "user.view",
];

export const SYSTEM_ROLE_DEFINITIONS = [
  {
    slug: SYSTEM_ROLE_SLUGS.FOUNDER,
    name: "Founder",
    description: "Full site ownership. All permissions.",
    color: "#7c2d12",
    priority: 1,
    isDefault: false,
    isSystem: true,
  },
  {
    slug: SYSTEM_ROLE_SLUGS.SYSTEM_ADMINISTRATOR,
    name: "System Administrator",
    description: "Full administrative access to the site.",
    color: "#b56d15",
    priority: 2,
    isDefault: false,
    isSystem: true,
  },
  {
    slug: SYSTEM_ROLE_SLUGS.MODERATOR,
    name: "Moderator",
    description: "Moderate forums with pinning and locking tools.",
    color: "#e29027",
    priority: 3,
    isDefault: false,
    isSystem: true,
  },
  {
    slug: SYSTEM_ROLE_SLUGS.CITIZEN,
    name: "Citizen",
    description: "Verified members who have linked their Minecraft account.",
    color: "#15803d",
    priority: 6,
    isDefault: false,
    isSystem: true,
  },
  {
    slug: SYSTEM_ROLE_SLUGS.TOURIST,
    name: "Tourist",
    description: "Unverified visitors who can browse but not post.",
    color: "#6b7280",
    priority: 7,
    isDefault: true,
    isSystem: true,
  },
] as const;

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleSlug, string[]> = {
  [SYSTEM_ROLE_SLUGS.FOUNDER]: ALL_PERMISSION_KEYS,
  [SYSTEM_ROLE_SLUGS.SYSTEM_ADMINISTRATOR]: ALL_PERMISSION_KEYS,
  [SYSTEM_ROLE_SLUGS.MODERATOR]: MODERATOR_PERMISSIONS,
  [SYSTEM_ROLE_SLUGS.CITIZEN]: CITIZEN_PERMISSIONS,
  [SYSTEM_ROLE_SLUGS.TOURIST]: TOURIST_PERMISSIONS,
};

export const FULL_ACCESS_ROLE_SLUGS = new Set<SystemRoleSlug>([
  SYSTEM_ROLE_SLUGS.FOUNDER,
  SYSTEM_ROLE_SLUGS.SYSTEM_ADMINISTRATOR,
]);

export const STAFF_ROLE_SLUGS = new Set<SystemRoleSlug>([
  SYSTEM_ROLE_SLUGS.FOUNDER,
  SYSTEM_ROLE_SLUGS.SYSTEM_ADMINISTRATOR,
  SYSTEM_ROLE_SLUGS.MODERATOR,
]);

export const MEMBER_ROLE_SLUGS = new Set<SystemRoleSlug>([
  SYSTEM_ROLE_SLUGS.CITIZEN,
  SYSTEM_ROLE_SLUGS.TOURIST,
]);

export function isFullAccessRoleSlug(slug: string): boolean {
  return FULL_ACCESS_ROLE_SLUGS.has(slug as SystemRoleSlug);
}

export function isStaffRoleSlug(slug: string): boolean {
  return STAFF_ROLE_SLUGS.has(slug as SystemRoleSlug);
}

export function isMemberRoleSlug(slug: string): boolean {
  return MEMBER_ROLE_SLUGS.has(slug as SystemRoleSlug);
}
