import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CODE_EXPIRY_MINUTES,
  generateVerificationCode,
  getCodeExpiryDate,
  normalizeMinecraftUuid,
  validateMinecraftUsername,
  validateMinecraftUuid,
  verifyPluginApiKey,
} from "@/lib/minecraft-verification";

export async function POST(request: NextRequest) {
  try {
    if (!verifyPluginApiKey(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const rawUuid = String(body.uuid ?? "");
    const minecraftUsername = String(body.username ?? "").trim();

    const minecraftUuid = normalizeMinecraftUuid(rawUuid);

    if (!minecraftUuid || !validateMinecraftUuid(minecraftUuid)) {
      return NextResponse.json(
        { error: "Invalid Minecraft UUID." },
        { status: 400 }
      );
    }

    if (!validateMinecraftUsername(minecraftUsername)) {
      return NextResponse.json(
        { error: "Invalid Minecraft username." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { minecraftUuid },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This Minecraft account is already linked to a forum account." },
        { status: 409 }
      );
    }

    await prisma.minecraftVerificationCode.deleteMany({
      where: {
        minecraftUuid,
        usedAt: null,
      },
    });

    let code = generateVerificationCode();
    let attempts = 0;

    while (attempts < 10) {
      const existingCode = await prisma.minecraftVerificationCode.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!existingCode) {
        break;
      }

      code = generateVerificationCode();
      attempts += 1;
    }

    if (attempts === 10) {
      return NextResponse.json(
        { error: "Unable to generate verification code. Please try again." },
        { status: 500 }
      );
    }

    await prisma.minecraftVerificationCode.create({
      data: {
        code,
        minecraftUuid,
        minecraftUsername,
        expiresAt: getCodeExpiryDate(),
      },
    });

    return NextResponse.json({
      code,
      expiresInMinutes: CODE_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error("Minecraft verification code error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
