import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import {
  hasEveryPermission,
  hasAnyPermission,
} from "@/lib/permissions";
import { getAllRequiredPermissions } from "@/lib/permissions/requirements";
import { getActiveBan, BAN_RESTRICTED_MESSAGE } from "@/lib/bans";
import { roleSlugBypassesMinecraftVerification } from "@/lib/system-roles";

export { BAN_RESTRICTED_MESSAGE };

export const SESSION_COOKIE_NAME = "dr_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SALT_ROUNDS = 12;

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export type SessionUser = {
  id: string;
  username: string;
  role: Role;
  minecraftUuid: string | null;
  bypassesMinecraftVerification: boolean;
};

export const MINECRAFT_LINK_REQUIRED_MESSAGE =
  "You must link your Minecraft account before posting. Go to Settings and verify with /forumsverify in-game.";

/** Set MINECRAFT_VERIFICATION_REQUIRED=false in .env to bypass for testing. */
export function isMinecraftVerificationRequired(): boolean {
  return process.env.MINECRAFT_VERIFICATION_REQUIRED !== "false";
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateUsername(username: string): ValidationResult {
  const trimmed = username.trim();

  if (!trimmed) {
    return { valid: false, error: "Username is required." };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error:
        "Username must be 3–20 characters and contain only lowercase letters, numbers, and underscores.",
    };
  }

  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: "Password is required." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          minecraftUuid: true,
          userRoles: {
            include: {
              role: {
                select: { slug: true },
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  const { user } = session;
  const bypassesMinecraftVerification =
    user.role === "ADMIN" ||
    user.role === "MODERATOR" ||
    user.userRoles.some((assignment) =>
      roleSlugBypassesMinecraftVerification(assignment.role.slug)
    );

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    minecraftUuid: user.minecraftUuid,
    bypassesMinecraftVerification,
  };
});

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

export function isModerator(role: Role): boolean {
  return role === "MODERATOR" || role === "ADMIN";
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}

export function canPost(user: SessionUser): boolean {
  if (!isMinecraftVerificationRequired()) {
    return true;
  }

  return Boolean(user.minecraftUuid) || user.bypassesMinecraftVerification;
}

/** Unverified members (typically Tourists) who must link Minecraft to unlock posting. */
export function needsMinecraftLink(user: SessionUser): boolean {
  return !user.minecraftUuid && !user.bypassesMinecraftVerification;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireAdminPermission("admin.dashboard.view");
}

export async function requireAdminPermission(
  permissionKey: string
): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const requiredKeys = [permissionKey, ...getAllRequiredPermissions(permissionKey)];
  const allowed =
    (await hasEveryPermission(user.id, requiredKeys)) || isAdmin(user.role);

  if (!allowed) {
    redirect("/access-denied");
  }

  return user;
}

export async function requireAnyAdminPermission(
  permissionKeys: string[]
): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const allowed =
    (
      await Promise.all(
        permissionKeys.map(async (key) => {
          const requiredKeys = [key, ...getAllRequiredPermissions(key)];
          return hasEveryPermission(user.id, requiredKeys);
        })
      )
    ).some(Boolean) || isAdmin(user.role);

  if (!allowed) {
    redirect("/access-denied");
  }

  return user;
}

export async function requireNotBanned(userId: string): Promise<void> {
  const banned = await getActiveBan(userId);
  if (banned) {
    throw new Error(BAN_RESTRICTED_MESSAGE);
  }
}

export async function isUserBanned(userId: string): Promise<boolean> {
  const ban = await getActiveBan(userId);
  return ban !== null;
}

export async function canUserPost(user: SessionUser): Promise<boolean> {
  if (await isUserBanned(user.id)) return false;
  return canPost(user);
}

export async function userCanModerate(userId: string): Promise<boolean> {
  return hasAnyPermission(userId, [
    "forum.thread.lock",
    "forum.thread.pin",
    "forum.post.editAny",
  ]);
}
