import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  createSession,
  hashPassword,
  setSessionCookie,
  validatePassword,
  validateUsername,
} from "@/lib/auth";
import { isRegistrationEnabled } from "@/lib/settings";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rateLimit = checkRateLimit({
      key: `register:${ip}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    if (!(await isRegistrationEnabled())) {
      return NextResponse.json(
        { error: "Registration is currently disabled." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username is already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const defaultRole = await prisma.appRole.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        userRoles: defaultRole
          ? { create: { roleId: defaultRole.id } }
          : undefined,
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
