import {
  getSettingBoolean,
  getSettingNumber,
  SETTING_KEYS,
} from "@/lib/settings";

export async function canUseCustomAvatar(): Promise<boolean> {
  return getSettingBoolean(SETTING_KEYS.allowCustomProfilePictures);
}

export async function canUseCustomBanner(): Promise<boolean> {
  return getSettingBoolean(SETTING_KEYS.allowCustomBanners);
}

export async function canEditBio(): Promise<boolean> {
  return getSettingBoolean(SETTING_KEYS.allowProfileBios);
}

export async function canUseSignature(): Promise<boolean> {
  return getSettingBoolean(SETTING_KEYS.allowSignatures);
}

export async function areSignaturesEnabled(): Promise<boolean> {
  return canUseSignature();
}

export async function getMaxBioLength(): Promise<number> {
  const value = await getSettingNumber(SETTING_KEYS.maxProfileBioLength);
  return value > 0 ? value : 500;
}

type SignatureSource = {
  id: string;
  signature: string | null;
  signatureEnabled: boolean;
};

export function resolveDisplaySignature(
  author: SignatureSource,
  signaturesGloballyEnabled: boolean
): string | null {
  if (!signaturesGloballyEnabled || !author.signatureEnabled) {
    return null;
  }

  const trimmed = author.signature?.trim();
  return trimmed ? trimmed : null;
}

export function attachDisplaySignature<T extends SignatureSource>(
  author: T,
  signaturesGloballyEnabled: boolean
): T & { displaySignature: string | null } {
  return {
    ...author,
    displaySignature: resolveDisplaySignature(
      author,
      signaturesGloballyEnabled
    ),
  };
}
