import { prisma } from "@/lib/prisma";
import {
  MODERATION_ACTIONS,
  type ModerationAction,
} from "@/lib/moderation-actions";

export { MODERATION_ACTIONS, type ModerationAction };

type LogDetails = Record<string, unknown>;

export async function createModerationLog(params: {
  actorId?: string | null;
  targetUserId?: string | null;
  action: ModerationAction | string;
  details?: LogDetails;
}): Promise<void> {
  await prisma.moderationLog.create({
    data: {
      actorId: params.actorId ?? null,
      targetUserId: params.targetUserId ?? null,
      action: params.action,
      details: params.details ? JSON.stringify(params.details) : null,
    },
  });
}

export function parseLogDetails(details: string | null): LogDetails {
  if (!details) {
    return {};
  }
  try {
    return JSON.parse(details) as LogDetails;
  } catch {
    return { raw: details };
  }
}

export type SettingChange = {
  key: string;
  label: string;
  from: string;
  to: string;
};

export const SETTING_LABELS: Record<string, string> = {
  siteName: "Site name",
  siteTagline: "Tagline",
  registrationEnabled: "Registration",
  dmsEnabled: "Direct messages",
  maxProfileBioLength: "Max profile bio length",
  allowCustomProfilePictures: "Custom profile pictures",
  allowCustomBanners: "Custom banners",
  allowProfileBios: "Profile bios",
  allowSignatures: "Signatures",
  maintenanceMode: "Maintenance mode",
  maintenanceMessage: "Maintenance message",
  pollsEnabled: "Polls",
  formsEnabled: "Forms",
  markdownEnabled: "Markdown",
  bbcodeEnabled: "BBCode",
};

const BOOLEAN_FIELD_LABELS: Record<string, { true: string; false: string }> = {
  isVisible: { true: "Visible", false: "Hidden" },
  isLocked: { true: "Locked", false: "Unlocked" },
  isPinned: { true: "Pinned", false: "Unpinned" },
  isDefault: { true: "Yes", false: "No" },
  canView: { true: "Allowed", false: "Denied" },
  canRead: { true: "Allowed", false: "Denied" },
  canCreateThreads: { true: "Allowed", false: "Denied" },
  canReply: { true: "Allowed", false: "Denied" },
  canViewOtherThreads: { true: "Allowed", false: "Denied" },
  canModerate: { true: "Allowed", false: "Denied" },
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  slug: "URL name",
  description: "Description",
  sortOrder: "Sort order",
  categoryId: "Parent category",
  isVisible: "Visibility",
  isLocked: "Lock status",
  isPinned: "Pinned",
  isDefault: "Default role",
  color: "Color",
  priority: "Priority",
  canView: "View",
  canRead: "Read",
  canCreateThreads: "Create threads",
  canReply: "Reply",
  canViewOtherThreads: "View other threads",
  canModerate: "Moderate",
};

const BOOLEAN_SETTING_KEYS = new Set([
  "registrationEnabled",
  "dmsEnabled",
  "allowCustomProfilePictures",
  "allowCustomBanners",
  "allowProfileBios",
  "allowSignatures",
  "maintenanceMode",
  "pollsEnabled",
  "formsEnabled",
  "markdownEnabled",
  "bbcodeEnabled",
]);

export function formatSettingValue(key: string, value: string): string {
  if (BOOLEAN_SETTING_KEYS.has(key)) {
    return value === "true" ? "Enabled" : "Disabled";
  }

  if (!value) {
    return "(empty)";
  }

  return value;
}

export type FieldChange = {
  key: string;
  label: string;
  from: string;
  to: string;
};

export function formatLogValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "(empty)";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function normalizeBooleanToken(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "yes", "1", "on", "enabled", "allowed"].includes(normalized)) {
    return true;
  }
  if (["false", "no", "0", "off", "disabled", "denied"].includes(normalized)) {
    return false;
  }

  return null;
}

function resolveBooleanFieldKey(fieldKey: string): string {
  if (fieldKey in BOOLEAN_FIELD_LABELS) {
    return fieldKey;
  }

  const suffix = fieldKey.split(".").pop() ?? fieldKey;
  if (suffix in BOOLEAN_FIELD_LABELS) {
    return suffix;
  }

  return fieldKey;
}

export function formatChangeValue(fieldKey: string, value: unknown): string {
  if (fieldKey in SETTING_LABELS) {
    return formatSettingValue(fieldKey, String(value));
  }

  const booleanFieldKey = resolveBooleanFieldKey(fieldKey);
  const booleanLabels = BOOLEAN_FIELD_LABELS[booleanFieldKey];
  const boolValue = normalizeBooleanToken(value);

  if (booleanLabels && boolValue !== null) {
    return boolValue ? booleanLabels.true : booleanLabels.false;
  }

  return formatLogValue(value);
}

export function buildFieldChanges(
  fields: Array<{ key: string; label: string; from: unknown; to: unknown }>
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of fields) {
    const from = formatLogValue(field.from);
    const to = formatLogValue(field.to);

    if (from === to) {
      continue;
    }

    changes.push({
      key: field.key,
      label: field.label,
      from,
      to,
    });
  }

  return changes;
}

export function buildSettingChanges(
  previous: Record<string, string>,
  updates: Record<string, string>
): SettingChange[] {
  const changes: SettingChange[] = [];

  for (const [key, to] of Object.entries(updates)) {
    const from = previous[key] ?? "";
    if (from === to) {
      continue;
    }

    changes.push({
      key,
      label: SETTING_LABELS[key] ?? key,
      from,
      to,
    });
  }

  return changes;
}

type LogDetailLine = {
  label: string;
  value: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pushLine(lines: LogDetailLine[], label: string, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  lines.push({
    label,
    value: typeof value === "string" ? value : JSON.stringify(value),
  });
}

export function formatLogDetailsForDisplay(
  action: string,
  details: LogDetails
): LogDetailLine[] {
  const lines: LogDetailLine[] = [];

  if (Array.isArray(details.changes) && details.changes.length > 0) {
    if (action.startsWith("CATEGORY_")) {
      pushLine(lines, "Category", details.name);
      pushLine(lines, "URL name", details.slug);
    } else if (action.startsWith("FORUM_")) {
      pushLine(lines, "Forum", details.name);
      pushLine(lines, "URL name", details.slug);
      pushLine(lines, "Category", details.categoryName);
    } else if (action.startsWith("ROLE_")) {
      pushLine(lines, "Role", details.name);
      pushLine(lines, "URL name", details.slug);
    }

    pushLine(lines, "Direction", details.direction);

    for (const change of details.changes) {
      const record = asRecord(change);
      if (!record) {
        continue;
      }

      const fieldKey = String(record.key ?? record.field ?? "");
      const label = String(
        record.label ?? SETTING_LABELS[fieldKey] ?? FIELD_LABELS[fieldKey] ?? fieldKey
      );
      const from = formatChangeValue(fieldKey, record.from);
      const to = formatChangeValue(fieldKey, record.to);

      if (from === to) {
        continue;
      }

      lines.push({
        label,
        value: `${from} → ${to}`,
      });
    }

    if (Array.isArray(details.permissionsAdded) && details.permissionsAdded.length > 0) {
      pushLine(lines, "Added abilities", details.permissionsAdded.join(", "));
    }

    if (
      Array.isArray(details.permissionsRemoved) &&
      details.permissionsRemoved.length > 0
    ) {
      pushLine(lines, "Removed abilities", details.permissionsRemoved.join(", "));
    }

    return lines;
  }

  if (Array.isArray(details.keys)) {
    lines.push({
      label: "Updated fields",
      value: details.keys.map((key) => SETTING_LABELS[String(key)] ?? String(key)).join(", "),
    });
    lines.push({
      label: "Note",
      value: "Older log entry — exact before/after values were not recorded.",
    });
    return lines;
  }

  if (details.from !== undefined && details.to !== undefined) {
    const fieldKey = String(details.key ?? "value");
    lines.push({
      label:
        SETTING_LABELS[fieldKey] ??
        FIELD_LABELS[fieldKey] ??
        String(details.label ?? "Value"),
      value: `${formatChangeValue(fieldKey, details.from)} → ${formatChangeValue(fieldKey, details.to)}`,
    });
    return lines;
  }

  switch (action) {
    case MODERATION_ACTIONS.USER_BANNED:
      pushLine(lines, "User", details.username);
      pushLine(lines, "Reason", details.reason);
      pushLine(
        lines,
        "Expires",
        details.expiresAt ? String(details.expiresAt) : "Permanent"
      );
      break;
    case MODERATION_ACTIONS.USER_UNBANNED:
      pushLine(lines, "User", details.username);
      pushLine(lines, "Lift reason", details.liftReason);
      break;
    case MODERATION_ACTIONS.USER_PASSWORD_RESET:
    case MODERATION_ACTIONS.USER_PROFILE_RESET:
      pushLine(lines, "User", details.username);
      break;
    case MODERATION_ACTIONS.MINECRAFT_UNLINKED:
      pushLine(lines, "User", details.username);
      pushLine(lines, "Previous Minecraft", details.previousMinecraft);
      break;
    case MODERATION_ACTIONS.USER_ROLE_ASSIGNED:
    case MODERATION_ACTIONS.USER_ROLE_REMOVED:
      pushLine(lines, "User", details.username);
      pushLine(lines, "Role", details.role);
      break;
    case MODERATION_ACTIONS.ROLE_CREATED:
    case MODERATION_ACTIONS.ROLE_UPDATED:
    case MODERATION_ACTIONS.ROLE_DELETED:
    case MODERATION_ACTIONS.ROLE_REORDERED:
      pushLine(lines, "Role", details.name);
      pushLine(lines, "Internal ID", details.slug);
      pushLine(lines, "Direction", details.direction);
      break;
    case MODERATION_ACTIONS.CATEGORY_CREATED:
      pushLine(lines, "Category", details.name);
      pushLine(lines, "URL name", details.slug);
      pushLine(
        lines,
        "Visibility",
        formatChangeValue("isVisible", details.isVisible)
      );
      pushLine(lines, "Display order", details.sortOrder);
      break;
    case MODERATION_ACTIONS.CATEGORY_UPDATED:
    case MODERATION_ACTIONS.CATEGORY_VISIBILITY_TOGGLED:
    case MODERATION_ACTIONS.CATEGORY_REORDERED:
    case MODERATION_ACTIONS.CATEGORY_ROLE_PERMISSION_UPDATED:
      pushLine(lines, "Category", details.name);
      pushLine(lines, "URL name", details.slug);
      pushLine(lines, "Direction", details.direction);
      pushLine(lines, "Quick setup", details.preset);
      if (Array.isArray(details.summary)) {
        pushLine(lines, "Access summary", details.summary.join("; "));
      }
      break;
    case MODERATION_ACTIONS.CATEGORY_DELETED:
      pushLine(lines, "Category", details.name);
      pushLine(lines, "URL name", details.slug);
      pushLine(lines, "Forums removed", details.deletedForums);
      pushLine(lines, "Threads removed", details.deletedThreads);
      break;
    case MODERATION_ACTIONS.FORUM_CREATED:
      pushLine(lines, "Forum", details.name);
      pushLine(lines, "URL name", details.slug);
      pushLine(lines, "Category", details.categoryName);
      pushLine(
        lines,
        "Visibility",
        formatChangeValue("isVisible", details.isVisible)
      );
      pushLine(
        lines,
        "Lock status",
        formatChangeValue("isLocked", details.isLocked)
      );
      pushLine(lines, "Display order", details.sortOrder);
      break;
    case MODERATION_ACTIONS.FORUM_UPDATED:
    case MODERATION_ACTIONS.FORUM_VISIBILITY_TOGGLED:
    case MODERATION_ACTIONS.FORUM_LOCK_TOGGLED:
    case MODERATION_ACTIONS.FORUM_REORDERED:
    case MODERATION_ACTIONS.FORUM_ROLE_PERMISSION_UPDATED:
      pushLine(lines, "Forum", details.name);
      pushLine(lines, "URL name", details.slug);
      pushLine(lines, "Category", details.categoryName);
      pushLine(lines, "Direction", details.direction);
      pushLine(lines, "Quick setup", details.preset);
      if (Array.isArray(details.summary)) {
        pushLine(lines, "Access summary", details.summary.join("; "));
      }
      break;
    case MODERATION_ACTIONS.FORUM_DELETED:
      pushLine(lines, "Forum", details.name);
      pushLine(lines, "URL name", details.slug);
      pushLine(lines, "Category", details.categoryName);
      break;
    case MODERATION_ACTIONS.THREAD_PINNED:
      pushLine(lines, "Thread", details.title);
      pushLine(lines, "Forum", details.forumSlug ?? details.forumName);
      pushLine(lines, "Status", "Pinned");
      break;
    case MODERATION_ACTIONS.THREAD_UNPINNED:
      pushLine(lines, "Thread", details.title);
      pushLine(lines, "Forum", details.forumSlug ?? details.forumName);
      pushLine(lines, "Status", "Unpinned");
      break;
    case MODERATION_ACTIONS.THREAD_LOCKED:
      pushLine(lines, "Thread", details.title);
      pushLine(lines, "Forum", details.forumSlug ?? details.forumName);
      pushLine(lines, "Status", "Locked");
      break;
    case MODERATION_ACTIONS.THREAD_UNLOCKED:
      pushLine(lines, "Thread", details.title);
      pushLine(lines, "Forum", details.forumSlug ?? details.forumName);
      pushLine(lines, "Status", "Unlocked");
      break;
    case MODERATION_ACTIONS.THREAD_MOVED:
      pushLine(lines, "Thread", details.title);
      pushLine(lines, "From", details.forumSlug ?? details.forumName);
      pushLine(lines, "To", details.toForumSlug ?? details.toForumName);
      break;
    case MODERATION_ACTIONS.MAINTENANCE_ENABLED:
      pushLine(lines, "Message", details.message ?? details.to);
      break;
    case MODERATION_ACTIONS.MAINTENANCE_MESSAGE_UPDATED:
      pushLine(lines, "Message", details.message ?? details.to);
      break;
    case MODERATION_ACTIONS.MAINTENANCE_DISABLED:
      lines.push({ label: "Status", value: "Maintenance mode turned off" });
      break;
    default:
      for (const [key, value] of Object.entries(details)) {
        if (key === "raw") {
          continue;
        }
        pushLine(lines, key, value);
      }
  }

  if (lines.length === 0 && details.raw) {
    pushLine(lines, "Details", details.raw);
  }

  return lines;
}
