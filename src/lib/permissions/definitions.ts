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
  { key: "forum.thread.move", label: "Move threads", category: "Forum" },
  { key: "forum.post.editAny", label: "Edit any post", category: "Forum" },
  { key: "forum.post.deleteAny", label: "Delete any post", category: "Forum" },
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
  // Profiles
  { key: "profile.editOwn", label: "Edit own profile", category: "Profiles" },
  { key: "profile.customAvatar", label: "Custom avatar", category: "Profiles" },
  { key: "profile.customBanner", label: "Custom banner", category: "Profiles" },
  { key: "profile.customDescription", label: "Custom bio", category: "Profiles" },
  // Admin
  { key: "admin.dashboard.view", label: "View admin dashboard", category: "Admin" },
  { key: "admin.settings.manage", label: "Manage site settings", category: "Admin" },
  { key: "admin.maintenance.manage", label: "Manage maintenance mode", category: "Admin" },
  { key: "admin.forums.manage", label: "Manage forums", category: "Admin" },
  { key: "admin.logs.view", label: "View staff logs", category: "Admin" },
  { key: "admin.roles.manage", label: "Manage roles", category: "Admin" },
  // Future: Polls (placeholder only)
  { key: "poll.create", label: "Create polls", category: "Future — Polls", description: "Coming soon." },
  { key: "poll.vote", label: "Vote in polls", category: "Future — Polls", description: "Coming soon." },
  { key: "poll.closeAny", label: "Close any poll", category: "Future — Polls", description: "Coming soon." },
  // Future: Forms (placeholder only)
  { key: "form.create", label: "Create forms", category: "Future — Forms", description: "Coming soon." },
  { key: "form.respond", label: "Fill out forms", category: "Future — Forms", description: "Coming soon." },
  { key: "form.viewResponses", label: "View form answers", category: "Future — Forms", description: "Coming soon." },
  { key: "form.manage", label: "Manage forms", category: "Future — Forms", description: "Coming soon." },
];

export const ALL_PERMISSION_KEYS = PERMISSION_DEFINITIONS.map((p) => p.key);

export const CRITICAL_ADMIN_PERMISSIONS = [
  "admin.dashboard.view",
  "admin.roles.manage",
  "user.changeRole",
];
