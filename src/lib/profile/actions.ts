"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createModerationLog, MODERATION_ACTIONS } from "@/lib/moderation-log";
import {
  canEditBio,
  canUseCustomAvatar,
  canUseCustomBanner,
  canUseSignature,
  getMaxBioLength,
} from "@/lib/profile/permissions";
import {
  deleteManagedProfileUpload,
  saveProfileImageUpload,
} from "@/lib/profile/uploads";
import {
  isValidProfileTextLength,
  normalizeProfileText,
  SIGNATURE_MAX_LENGTH,
} from "@/lib/profile/text";

export type ProfileActionResult =
  | {
      success: true;
      message?: string;
      avatarUrl?: string | null;
      bannerUrl?: string | null;
    }
  | { success: false; error: string };

async function requireAuthenticatedUser(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> }
  | { error: string }
> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Not authenticated." };
  }
  return { user };
}

export async function saveProfileBio(bio: string): Promise<ProfileActionResult> {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!(await canEditBio())) {
    return {
      success: false,
      error: "Profile bios are disabled on this site.",
    };
  }

  const maxLength = await getMaxBioLength();
  const normalized = normalizeProfileText(bio);

  if (!isValidProfileTextLength(normalized, maxLength)) {
    return {
      success: false,
      error: `Bio must be ${maxLength} characters or fewer (BBCode tags don't count).`,
    };
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      bio: normalized || null,
      profileUpdatedAt: new Date(),
    },
  });

  await createModerationLog({
    actorId: auth.user.id,
    targetUserId: auth.user.id,
    action: MODERATION_ACTIONS.USER_PROFILE_UPDATED,
    details: { field: "bio" },
  });

  revalidatePath("/settings");
  revalidatePath(`/profile/${auth.user.username}`);

  return { success: true, message: "Bio saved." };
}

export async function saveProfileSignature(
  signature: string,
  enabled: boolean
): Promise<ProfileActionResult> {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!(await canUseSignature())) {
    return {
      success: false,
      error: "Signatures are disabled on this site.",
    };
  }

  const normalized = normalizeProfileText(signature);

  if (!isValidProfileTextLength(normalized, SIGNATURE_MAX_LENGTH)) {
    return {
      success: false,
      error: `Signature must be ${SIGNATURE_MAX_LENGTH} characters or fewer (BBCode tags don't count).`,
    };
  }

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      signature: normalized || null,
      signatureEnabled: enabled,
      profileUpdatedAt: new Date(),
    },
  });

  await createModerationLog({
    actorId: auth.user.id,
    targetUserId: auth.user.id,
    action: MODERATION_ACTIONS.USER_SIGNATURE_UPDATED,
    details: { enabled },
  });

  revalidatePath("/settings");

  return { success: true, message: "Signature saved." };
}

export async function uploadProfileAvatar(
  formData: FormData
): Promise<ProfileActionResult> {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!(await canUseCustomAvatar())) {
    return {
      success: false,
      error: "Custom avatars are disabled on this site.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Please choose an image to upload." };
  }

  const saved = await saveProfileImageUpload(file, "avatar");
  if ("error" in saved) {
    return { success: false, error: saved.error };
  }

  const existing = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { avatarUrl: true },
  });

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      avatarUrl: saved.url,
      profileUpdatedAt: new Date(),
    },
  });

  await deleteManagedProfileUpload(existing?.avatarUrl);

  await createModerationLog({
    actorId: auth.user.id,
    targetUserId: auth.user.id,
    action: MODERATION_ACTIONS.USER_PROFILE_UPDATED,
    details: { field: "avatar" },
  });

  revalidatePath("/settings");
  revalidatePath(`/profile/${auth.user.username}`);

  return { success: true, message: "Avatar updated.", avatarUrl: saved.url };
}

export async function uploadProfileBanner(
  formData: FormData
): Promise<ProfileActionResult> {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!(await canUseCustomBanner())) {
    return {
      success: false,
      error: "Custom banners are disabled on this site.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Please choose an image to upload." };
  }

  const saved = await saveProfileImageUpload(file, "banner");
  if ("error" in saved) {
    return { success: false, error: saved.error };
  }

  const existing = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { bannerUrl: true },
  });

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      bannerUrl: saved.url,
      profileUpdatedAt: new Date(),
    },
  });

  await deleteManagedProfileUpload(existing?.bannerUrl);

  await createModerationLog({
    actorId: auth.user.id,
    targetUserId: auth.user.id,
    action: MODERATION_ACTIONS.USER_PROFILE_UPDATED,
    details: { field: "banner" },
  });

  revalidatePath("/settings");
  revalidatePath(`/profile/${auth.user.username}`);

  return { success: true, message: "Banner updated.", bannerUrl: saved.url };
}

export async function removeProfileAvatar(): Promise<ProfileActionResult> {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!(await canUseCustomAvatar())) {
    return {
      success: false,
      error: "Custom avatars are disabled on this site.",
    };
  }

  const existing = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { avatarUrl: true },
  });

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      avatarUrl: null,
      profileUpdatedAt: new Date(),
    },
  });

  await deleteManagedProfileUpload(existing?.avatarUrl);

  await createModerationLog({
    actorId: auth.user.id,
    targetUserId: auth.user.id,
    action: MODERATION_ACTIONS.USER_AVATAR_REMOVED,
  });

  revalidatePath("/settings");
  revalidatePath(`/profile/${auth.user.username}`);

  return { success: true, message: "Avatar removed.", avatarUrl: null };
}

export async function removeProfileBanner(): Promise<ProfileActionResult> {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!(await canUseCustomBanner())) {
    return {
      success: false,
      error: "Custom banners are disabled on this site.",
    };
  }

  const existing = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { bannerUrl: true },
  });

  await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      bannerUrl: null,
      profileUpdatedAt: new Date(),
    },
  });

  await deleteManagedProfileUpload(existing?.bannerUrl);

  await createModerationLog({
    actorId: auth.user.id,
    targetUserId: auth.user.id,
    action: MODERATION_ACTIONS.USER_BANNER_REMOVED,
  });

  revalidatePath("/settings");
  revalidatePath(`/profile/${auth.user.username}`);

  return { success: true, message: "Banner removed.", bannerUrl: null };
}
