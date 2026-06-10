import {
  isFullAccessRoleSlug,
  isStaffRoleSlug,
  STAFF_ROLE_SLUGS,
} from "@/lib/system-roles";

export { STAFF_ROLE_SLUGS };

export type ForumAccessFlags = {
  canView: boolean;
  canRead: boolean;
  canCreateThreads: boolean;
  canReply: boolean;
  canViewOtherThreads: boolean;
  canModerate: boolean;
};

export type ForumAccessPresetId =
  | "public"
  | "readOnly"
  | "staffOnly"
  | "applications"
  | "hidden";

export type ForumAccessPreset = {
  id: ForumAccessPresetId;
  label: string;
  description: string;
  /** Applied to non-staff roles (user slug). Staff roles get full access. */
  values: ForumAccessFlags;
};

export const FULL_FORUM_ACCESS: ForumAccessFlags = {
  canView: true,
  canRead: true,
  canCreateThreads: true,
  canReply: true,
  canViewOtherThreads: true,
  canModerate: true,
};

export const DEFAULT_FORUM_ACCESS: ForumAccessFlags = {
  canView: true,
  canRead: true,
  canCreateThreads: true,
  canReply: true,
  canViewOtherThreads: true,
  canModerate: false,
};

export const HIDDEN_FORUM_ACCESS: ForumAccessFlags = {
  canView: false,
  canRead: false,
  canCreateThreads: false,
  canReply: false,
  canViewOtherThreads: false,
  canModerate: false,
};

export const FORUM_ACCESS_PRESETS: ForumAccessPreset[] = [
  {
    id: "public",
    label: "Open to everyone",
    description: "Anyone can read and post normally.",
    values: DEFAULT_FORUM_ACCESS,
  },
  {
    id: "readOnly",
    label: "Read only",
    description: "People can read but not post.",
    values: {
      canView: true,
      canRead: true,
      canCreateThreads: false,
      canReply: false,
      canViewOtherThreads: true,
      canModerate: false,
    },
  },
  {
    id: "staffOnly",
    label: "Staff only",
    description: "Hidden from regular members. Staff can do everything.",
    values: HIDDEN_FORUM_ACCESS,
  },
  {
    id: "applications",
    label: "Applications & reports",
    description:
      "Members can submit their own thread but cannot see other people's. Staff see everything.",
    values: {
      canView: true,
      canRead: true,
      canCreateThreads: true,
      canReply: true,
      canViewOtherThreads: false,
      canModerate: false,
    },
  },
  {
    id: "hidden",
    label: "Hidden",
    description: "Nobody sees this except admins.",
    values: HIDDEN_FORUM_ACCESS,
  },
];

export function getPresetById(id: ForumAccessPresetId): ForumAccessPreset {
  const preset = FORUM_ACCESS_PRESETS.find((entry) => entry.id === id);
  if (!preset) {
    throw new Error(`Unknown preset: ${id}`);
  }
  return preset;
}

export function applyPresetToRole(
  presetId: ForumAccessPresetId,
  roleSlug: string
): ForumAccessFlags {
  const preset = getPresetById(presetId);

  if (preset.id === "staffOnly" || preset.id === "applications") {
    if (isStaffRoleSlug(roleSlug)) {
      return FULL_FORUM_ACCESS;
    }
  }

  if (isFullAccessRoleSlug(roleSlug)) {
    return FULL_FORUM_ACCESS;
  }

  return preset.values;
}
