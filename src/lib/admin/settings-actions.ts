"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { assertAdminPermission } from "@/lib/admin/auth";
import {
  getAllSettings,
  getSetting,
  getSettingBoolean,
  setSetting,
  SETTING_KEYS,
} from "@/lib/settings";
import { setMaintenanceCookie } from "@/lib/maintenance-cookie";
import {
  buildSettingChanges,
  createModerationLog,
  MODERATION_ACTIONS,
} from "@/lib/moderation-log";

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

export async function adminUpdateMaintenance(formData: FormData): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "admin.maintenance.manage");
  if (!perm.success) return perm;

  const enabled = formData.get("maintenanceMode") === "on";
  const message = String(formData.get("maintenanceMessage") ?? "").trim();

  const wasEnabled = await getSettingBoolean(SETTING_KEYS.maintenanceMode);
  const previousMessage = await getSetting(SETTING_KEYS.maintenanceMessage);

  await setSetting(SETTING_KEYS.maintenanceMode, enabled ? "true" : "false");
  if (message) {
    await setSetting(SETTING_KEYS.maintenanceMessage, message);
  }

  await setMaintenanceCookie(enabled);

  if (enabled && !wasEnabled) {
    await createModerationLog({
      actorId: actor.id,
      action: MODERATION_ACTIONS.MAINTENANCE_ENABLED,
      details: {
        key: SETTING_KEYS.maintenanceMode,
        from: "false",
        to: "true",
        message,
      },
    });
  } else if (!enabled && wasEnabled) {
    await createModerationLog({
      actorId: actor.id,
      action: MODERATION_ACTIONS.MAINTENANCE_DISABLED,
      details: {
        key: SETTING_KEYS.maintenanceMode,
        from: "true",
        to: "false",
      },
    });
  } else if (message && message !== previousMessage) {
    await createModerationLog({
      actorId: actor.id,
      action: MODERATION_ACTIONS.MAINTENANCE_MESSAGE_UPDATED,
      details: {
        key: SETTING_KEYS.maintenanceMessage,
        from: previousMessage,
        to: message,
      },
    });
  }

  revalidatePath("/admin/maintenance");
  return {
    success: true,
    message: enabled ? "Maintenance mode enabled." : "Maintenance mode disabled.",
  };
}

export async function adminUpdateSiteSettings(formData: FormData): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "admin.settings.manage");
  if (!perm.success) return perm;

  const updates: Record<string, string> = {
    [SETTING_KEYS.siteName]: String(formData.get("siteName") ?? "").trim(),
    [SETTING_KEYS.siteTagline]: String(formData.get("siteTagline") ?? "").trim(),
    [SETTING_KEYS.registrationEnabled]:
      formData.get("registrationEnabled") === "on" ? "true" : "false",
    [SETTING_KEYS.dmsEnabled]: formData.get("dmsEnabled") === "on" ? "true" : "false",
    [SETTING_KEYS.pollsEnabled]: formData.get("pollsEnabled") === "on" ? "true" : "false",
    [SETTING_KEYS.formsEnabled]: formData.get("formsEnabled") === "on" ? "true" : "false",
    [SETTING_KEYS.maxProfileBioLength]: String(
      formData.get("maxProfileBioLength") ?? "500"
    ),
    [SETTING_KEYS.allowCustomProfilePictures]:
      formData.get("allowCustomProfilePictures") === "on" ? "true" : "false",
    [SETTING_KEYS.allowCustomBanners]:
      formData.get("allowCustomBanners") === "on" ? "true" : "false",
    [SETTING_KEYS.allowProfileBios]:
      formData.get("allowProfileBios") === "on" ? "true" : "false",
    [SETTING_KEYS.allowSignatures]:
      formData.get("allowSignatures") === "on" ? "true" : "false",
  };

  const previous = await getAllSettings();
  const changes = buildSettingChanges(previous, updates);

  for (const [key, value] of Object.entries(updates)) {
    if (value) await setSetting(key as keyof typeof SETTING_KEYS, value);
  }

  if (changes.length > 0) {
    await createModerationLog({
      actorId: actor.id,
      action: MODERATION_ACTIONS.SITE_SETTING_UPDATED,
      details: { changes },
    });
  }

  revalidatePath("/admin/settings");
  return { success: true, message: "Site settings saved." };
}
