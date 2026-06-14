import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isValidVerificationCodeFormat,
  normalizeVerificationCode,
} from "@/lib/minecraft-verification";
import { assignCitizenRoleOnMinecraftLink } from "@/lib/user-member-roles";
import { clearPermissionCache } from "@/lib/permissions";
import { createModerationLog, MODERATION_ACTIONS } from "@/lib/moderation-log";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json(
        { error: "You must be logged in to link your Minecraft account." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const code = normalizeVerificationCode(String(body.code ?? ""));

    if (!isValidVerificationCodeFormat(code)) {
      return NextResponse.json(
        { error: "Invalid verification code format." },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        username: true,
        minecraftUuid: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (currentUser.minecraftUuid) {
      return NextResponse.json(
        { error: "Your forum account already has a linked Minecraft account." },
        { status: 409 }
      );
    }

    const verificationCode = await prisma.minecraftVerificationCode.findUnique({
      where: { code },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Verification code not found." },
        { status: 404 }
      );
    }

    if (verificationCode.usedAt) {
      return NextResponse.json(
        { error: "This verification code has already been used." },
        { status: 410 }
      );
    }

    if (verificationCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This verification code has expired. Run /forumsverify again in-game." },
        { status: 410 }
      );
    }

    const linkedUser = await prisma.user.findUnique({
      where: { minecraftUuid: verificationCode.minecraftUuid },
      select: { id: true },
    });

    if (linkedUser) {
      return NextResponse.json(
        { error: "This Minecraft account is already linked to another forum account." },
        { status: 409 }
      );
    }

    const linkedAt = new Date();

    const roleResult = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          minecraftUuid: verificationCode.minecraftUuid,
          minecraftUsername: verificationCode.minecraftUsername,
          minecraftLinkedAt: linkedAt,
        },
      });
      await tx.minecraftVerificationCode.update({
        where: { id: verificationCode.id },
        data: { usedAt: linkedAt },
      });

      return assignCitizenRoleOnMinecraftLink(currentUser.id, tx);
    });

    if (roleResult.assignedRoleSlug) {
      clearPermissionCache(currentUser.id);
    }

    if (roleResult.promotedToCitizen) {
      await createModerationLog({
        actorId: currentUser.id,
        targetUserId: currentUser.id,
        action: MODERATION_ACTIONS.USER_ROLE_ASSIGNED,
        details: {
          username: currentUser.username,
          role: "Citizen",
          source: "minecraft_link",
        },
      });
    }

    return NextResponse.json({
      success: true,
      minecraftUsername: verificationCode.minecraftUsername,
      minecraftLinkedAt: linkedAt.toISOString(),
      promotedToCitizen: roleResult.promotedToCitizen,
      assignedRole: roleResult.promotedToCitizen ? "Citizen" : null,
    });
  } catch (error) {
    console.error("Link Minecraft error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
