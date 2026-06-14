import { prisma } from "@/lib/prisma";

export const SETTING_KEYS = {
  siteName: "siteName",
  siteTagline: "siteTagline",
  registrationEnabled: "registrationEnabled",
  dmsEnabled: "dmsEnabled",
  maxProfileBioLength: "maxProfileBioLength",
  allowCustomProfilePictures: "allowCustomProfilePictures",
  allowCustomBanners: "allowCustomBanners",
  allowProfileBios: "allowProfileBios",
  allowSignatures: "allowSignatures",
  maintenanceMode: "maintenanceMode",
  maintenanceMessage: "maintenanceMessage",
  pollsEnabled: "pollsEnabled",
  formsEnabled: "formsEnabled",
  markdownEnabled: "markdownEnabled",
  bbcodeEnabled: "bbcodeEnabled",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.siteName]: "District Roleplay",
  [SETTING_KEYS.siteTagline]: "Community Forum",
  [SETTING_KEYS.registrationEnabled]: "true",
  [SETTING_KEYS.dmsEnabled]: "true",
  [SETTING_KEYS.maxProfileBioLength]: "500",
  [SETTING_KEYS.allowCustomProfilePictures]: "false",
  [SETTING_KEYS.allowCustomBanners]: "false",
  [SETTING_KEYS.allowProfileBios]: "true",
  [SETTING_KEYS.allowSignatures]: "true",
  [SETTING_KEYS.maintenanceMode]: "false",
  [SETTING_KEYS.maintenanceMessage]:
    "District Roleplay is currently undergoing maintenance. Please check back soon.",
  [SETTING_KEYS.pollsEnabled]: "false",
  [SETTING_KEYS.formsEnabled]: "false",
  [SETTING_KEYS.markdownEnabled]: "false",
  [SETTING_KEYS.bbcodeEnabled]: "false",
};

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function getSettingBoolean(key: SettingKey): Promise<boolean> {
  const value = await getSetting(key);
  return value === "true";
}

export async function getSettingNumber(key: SettingKey): Promise<number> {
  const value = await getSetting(key);
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany();
  const result = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function isMaintenanceModeEnabled(): Promise<boolean> {
  return getSettingBoolean(SETTING_KEYS.maintenanceMode);
}

export async function isRegistrationEnabled(): Promise<boolean> {
  return getSettingBoolean(SETTING_KEYS.registrationEnabled);
}

export async function isDmsEnabled(): Promise<boolean> {
  return getSettingBoolean(SETTING_KEYS.dmsEnabled);
}

export async function isPollsEnabled(): Promise<boolean> {
  return getSettingBoolean(SETTING_KEYS.pollsEnabled);
}

export async function isFormsEnabled(): Promise<boolean> {
  return getSettingBoolean(SETTING_KEYS.formsEnabled);
}
