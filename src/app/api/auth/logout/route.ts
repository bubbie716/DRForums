import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  clearSessionCookie,
  destroySession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await destroySession(token);
    }

    await clearSessionCookie();

    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Logout error:", error);
    await clearSessionCookie();
    return NextResponse.redirect(new URL("/", request.url));
  }
}
