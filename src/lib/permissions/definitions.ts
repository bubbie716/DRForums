export type PermissionDefinition = {
  key: string;
  label: string;
  description?: string;
  category: string;
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Forum
  { key: "forum.thread.create", label: "Create threads", category: "Forum" },
  { key: "forum.thread.reply", label: "Reply to threads", category: "Forum" },
  { key: "forum.thread.editOwn", label: "Edit own threads", category: "Forum" },
  { key: "forum.thread.deleteOwn", label: "Delete own threads", category: "Forum" },
  { key: "forum.thread.lock", label: "Lock threads", category: "Forum" },
  { key: "forum.thread.pin", label: "Pin threads", category: "Forum" },
  {
    key: "forum.thread.move",
    label: "Move threads",
    description: "Future — thread move UI not implemented yet.",
    category: "Forum",
  },
  {
    key: "forum.post.editAny",
    label: "Edit any post",
    description: "Future — post moderation UI not implemented yet.",
    category: "Forum",
  },
  {
    key: "forum.post.deleteAny",
    label: "Delete any post",
    description: "Future — post moderation UI not implemented yet.",
    category: "Forum",
  },
  // DMs
  { key: "dm.send", label: "Send private messages", category: "Direct Messages" },
  { key: "dm.read", label: "Read private messages", category: "Direct Messages" },
  { key: "dm.deleteOwn", label: "Delete own messages", category: "Direct Messages" },
  // Users
  { key: "user.view", label: "View users", category: "Users" },
  { key: "user.edit", label: "Edit users", category: "Users" },
  { key: "user.ban", label: "Forum ban users", category: "Users" },
  { key: "user.unban", label: "Lift forum bans", category: "Users" },
  { key: "user.changeRole", label: "Change user roles", category: "Users" },
  { key: "user.unlinkMinecraft", label: "Unlink Minecraft accounts", category: "Users" },
  { key: "user.resetPassword", label: "Reset user passwords", category: "Users" },
  { key: "user.resetProfile", label: "Reset public profiles", category: "Users" },
  // Admin
  { key: "admin.dashboard.view", label: "View admin dashboard", category: "Admin" },
  { key: "admin.settings.manage", label: "Manage site settings", category: "Admin" },
  { key: "admin.maintenance.manage", label: "Manage maintenance mode", category: "Admin" },
  { key: "admin.forums.manage", label: "Manage forums", category: "Admin" },
  { key: "admin.logs.view", label: "View staff logs", category: "Admin" },
  { key: "admin.roles.manage", label: "Manage roles", category: "Admin" },
  // Polls
  { key: "poll.create", label: "Create polls", category: "Polls" },
  { key: "poll.vote", label: "Vote in polls", category: "Polls" },
  { key: "poll.closeOwn", label: "Close own polls", category: "Polls" },
  { key: "poll.closeAny", label: "Manage any poll", category: "Polls" },
  // Forms
  { key: "form.create", label: "Create forms", category: "Forms" },
  { key: "form.edit", label: "Edit forms", category: "Forms" },
  { key: "form.delete", label: "Delete forms", category: "Forms" },
  { key: "form.respond", label: "Submit forms", category: "Forms" },
  { key: "form.viewResponses", label: "View form submissions", category: "Forms" },
  { key: "form.manageResponses", label: "Review form submissions", category: "Forms" },
];

export const ALL_PERMISSION_KEYS = PERMISSION_DEFINITIONS.map((p) => p.key);

export const CRITICAL_ADMIN_PERMISSIONS = [
  "admin.dashboard.view",
  "admin.roles.manage",
  "user.changeRole",
];
