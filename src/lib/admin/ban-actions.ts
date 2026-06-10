"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { assertAdminPermission } from "@/lib/admin/auth";
import { createModerationLog, MODERATION_ACTIONS } from "@/lib/moderation-log";
import {
  countUsersWithCriticalAdminAccess,
  userHasCriticalAdminAccess,
} from "@/lib/permissions";
import { getActiveBan } from "@/lib/bans";

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

type CreateBanInput = {
  userId: string;
  reason: string;
  internalNote?: string;
  duration: "permanent" | "1d" | "3d" | "7d" | "30d" | "custom";
  customExpiresAt?: string;
};

function computeExpiresAt(input: CreateBanInput): Date | null {
  if (input.duration === "permanent") return null;
  if (input.duration === "custom" && input.customExpiresAt) {
    return new Date(input.customExpiresAt);
  }
  const now = new Date();
  const days =
    input.duration === "1d"
      ? 1
      : input.duration === "3d"
        ? 3
        : input.duration === "7d"
          ? 7
          : input.duration === "30d"
            ? 30
            : 0;
  if (days === 0) return null;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function adminCreateBan(input: CreateBanInput): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "user.ban");
  if (!perm.success) return perm;

  if (!input.reason.trim()) {
    return { success: false, error: "Ban reason is required." };
  }

  const target = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, username: true },
  });
  if (!target) return { success: false, error: "User not found." };

  if (await userHasCriticalAdminAccess(input.userId)) {
    const others = await countUsersWithCriticalAdminAccess(input.userId);
    if (others === 0) {
      return { success: false, error: "Cannot ban the last admin account." };
    }
  }

  const existing = await getActiveBan(input.userId);
  if (existing) {
    return { success: false, error: "User already has an active ban." };
  }

  const expiresAt = computeExpiresAt(input);

  const ban = await prisma.ban.create({
    data: {
      userId: input.userId,
      bannedById: actor.id,
      reason: input.reason.trim(),
      internalNote: input.internalNote?.trim() || null,
      expiresAt,
    },
  });

  await createModerationLog({
    actorId: actor.id,
    targetUserId: input.userId,
    action: MODERATION_ACTIONS.USER_BANNED,
    details: {
      username: target.username,
      reason: input.reason.trim(),
      expiresAt: expiresAt?.toISOString() ?? null,
      banId: ban.id,
    },
  });

  revalidatePath("/admin/bans");
  revalidatePath(`/admin/users/${input.userId}`);
  return {
    success: true,
    message: `${target.username} has been forum banned. They can still join the Minecraft server.`,
  };
}

export async function adminLiftBan(
  banId: string,
  liftReason: string
): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "user.unban");
  if (!perm.success) return perm;

  if (!liftReason.trim()) {
    return { success: false, error: "Lift reason is required." };
  }

  const ban = await prisma.ban.findUnique({
    where: { id: banId },
    include: { user: { select: { id: true, username: true } } },
  });
  if (!ban) return { success: false, error: "Ban not found." };
  if (ban.liftedAt) return { success: false, error: "Ban already lifted." };

  await prisma.ban.update({
    where: { id: banId },
    data: {
      liftedAt: new Date(),
      liftedById: actor.id,
      liftReason: liftReason.trim(),
    },
  });

  await createModerationLog({
    actorId: actor.id,
    targetUserId: ban.userId,
    action: MODERATION_ACTIONS.USER_UNBANNED,
    details: {
      username: ban.user.username,
      liftReason: liftReason.trim(),
      banId,
    },
  });

  revalidatePath("/admin/bans");
  revalidatePath(`/admin/bans/${banId}`);
  revalidatePath(`/admin/users/${ban.userId}`);
  return {
    success: true,
    message: `Forum ban lifted for ${ban.user.username}.`,
  };
}

export async function adminBanUserFromDetail(
  userId: string,
  formData: FormData
): Promise<AdminActionResult> {
  const result = await adminCreateBan({
    userId,
    reason: String(formData.get("reason") ?? ""),
    internalNote: String(formData.get("internalNote") ?? ""),
    duration: String(formData.get("duration") ?? "permanent") as CreateBanInput["duration"],
    customExpiresAt: String(formData.get("customExpiresAt") ?? ""),
  });
  return result;
}

export async function adminCreateBanAndRedirect(formData: FormData) {
  const result = await adminCreateBan({
    userId: String(formData.get("userId") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    internalNote: String(formData.get("internalNote") ?? ""),
    duration: String(formData.get("duration") ?? "permanent") as CreateBanInput["duration"],
    customExpiresAt: String(formData.get("customExpiresAt") ?? ""),
  });

  if (result.success) {
    redirect("/admin/bans?notice=ban-created");
  }
  return result;
}
