import { MODERATION_ACTIONS } from "@/lib/moderation-actions";

export const MODERATION_ACTION_LABELS: Record<string, string> = {
  [MODERATION_ACTIONS.USER_BANNED]: "User forum banned",
  [MODERATION_ACTIONS.USER_UNBANNED]: "Forum ban lifted",
  [MODERATION_ACTIONS.USER_PASSWORD_RESET]: "Password reset",
  [MODERATION_ACTIONS.USER_PROFILE_RESET]: "Profile reset",
  [MODERATION_ACTIONS.USER_PROFILE_UPDATED]: "Profile updated",
  [MODERATION_ACTIONS.USER_AVATAR_REMOVED]: "Avatar removed",
  [MODERATION_ACTIONS.USER_BANNER_REMOVED]: "Banner removed",
  [MODERATION_ACTIONS.USER_SIGNATURE_UPDATED]: "Signature updated",
  [MODERATION_ACTIONS.USER_ROLE_ASSIGNED]: "Role added",
  [MODERATION_ACTIONS.USER_ROLE_REMOVED]: "Role removed",
  [MODERATION_ACTIONS.MINECRAFT_UNLINKED]: "Minecraft unlinked",
  [MODERATION_ACTIONS.ROLE_CREATED]: "Role created",
  [MODERATION_ACTIONS.ROLE_UPDATED]: "Role updated",
  [MODERATION_ACTIONS.ROLE_DELETED]: "Role deleted",
  [MODERATION_ACTIONS.ROLE_REORDERED]: "Role moved",
  [MODERATION_ACTIONS.CATEGORY_CREATED]: "Category created",
  [MODERATION_ACTIONS.CATEGORY_UPDATED]: "Category updated",
  [MODERATION_ACTIONS.CATEGORY_DELETED]: "Category deleted",
  [MODERATION_ACTIONS.CATEGORY_VISIBILITY_TOGGLED]: "Category visibility changed",
  [MODERATION_ACTIONS.CATEGORY_REORDERED]: "Category moved",
  [MODERATION_ACTIONS.CATEGORY_ROLE_PERMISSION_UPDATED]: "Category access updated",
  [MODERATION_ACTIONS.FORUM_CREATED]: "Forum created",
  [MODERATION_ACTIONS.FORUM_UPDATED]: "Forum updated",
  [MODERATION_ACTIONS.FORUM_DELETED]: "Forum deleted",
  [MODERATION_ACTIONS.FORUM_VISIBILITY_TOGGLED]: "Forum visibility changed",
  [MODERATION_ACTIONS.FORUM_LOCK_TOGGLED]: "Forum lock changed",
  [MODERATION_ACTIONS.FORUM_REORDERED]: "Forum moved",
  [MODERATION_ACTIONS.FORUM_ROLE_PERMISSION_UPDATED]: "Forum access updated",
  [MODERATION_ACTIONS.THREAD_MOVED]: "Thread moved",
  [MODERATION_ACTIONS.THREAD_LOCKED]: "Thread locked",
  [MODERATION_ACTIONS.THREAD_UNLOCKED]: "Thread unlocked",
  [MODERATION_ACTIONS.THREAD_PINNED]: "Thread pinned",
  [MODERATION_ACTIONS.THREAD_UNPINNED]: "Thread unpinned",
  [MODERATION_ACTIONS.MAINTENANCE_ENABLED]: "Maintenance turned on",
  [MODERATION_ACTIONS.MAINTENANCE_DISABLED]: "Maintenance turned off",
  [MODERATION_ACTIONS.MAINTENANCE_MESSAGE_UPDATED]: "Maintenance message updated",
  [MODERATION_ACTIONS.SITE_SETTING_UPDATED]: "Site settings updated",
  [MODERATION_ACTIONS.POLL_CREATED]: "Poll created",
  [MODERATION_ACTIONS.POLL_CLOSED]: "Poll closed",
  [MODERATION_ACTIONS.POLL_REOPENED]: "Poll reopened",
  [MODERATION_ACTIONS.POLL_DELETED]: "Poll deleted",
  [MODERATION_ACTIONS.FORM_CREATED]: "Form created",
  [MODERATION_ACTIONS.FORM_UPDATED]: "Form updated",
  [MODERATION_ACTIONS.FORM_OPENED]: "Form opened",
  [MODERATION_ACTIONS.FORM_CLOSED]: "Form closed",
  [MODERATION_ACTIONS.FORM_DELETED]: "Form deleted",
  [MODERATION_ACTIONS.FORM_SUBMISSION_REVIEWED]: "Form submission reviewed",
};

export function formatModerationActionLabel(action: string): string {
  return (
    MODERATION_ACTION_LABELS[action] ??
    action
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export const PERMISSION_CATEGORY_LABELS: Record<string, string> = {
  Forum: "Forums",
  "Direct Messages": "Messages",
  Users: "Users",
  Admin: "Admin panel",
  Polls: "Polls",
  Forms: "Forms",
  "Future — Polls": "Polls",
  "Future — Forms": "Forms",
};

