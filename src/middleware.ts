import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE_COOKIE = "dr_maintenance";
const MAINTENANCE_POLL_COOKIE = "dr_maintenance_polled";
const MAINTENANCE_POLL_INTERVAL_MS = 30_000;

function isBypassedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/maintenance" ||
    pathname === "/access-denied" ||
    pathname.startsWith("/admin") ||
    pathname.includes(".")
  );
}

async function getMaintenanceEnabled(request: NextRequest): Promise<boolean> {
  try {
    const statusUrl = new URL("/api/internal/maintenance-status", request.url);
    const response = await fetch(statusUrl, { cache: "no-store" });
    if (!response.ok) {
      return request.cookies.get(MAINTENANCE_COOKIE)?.value === "1";
    }

    const data = (await response.json()) as { enabled?: boolean };
    return data.enabled === true;
  } catch {
    return request.cookies.get(MAINTENANCE_COOKIE)?.value === "1";
  }
}

function shouldPollMaintenanceStatus(request: NextRequest): boolean {
  const polledAt = Number(request.cookies.get(MAINTENANCE_POLL_COOKIE)?.value);
  if (!Number.isFinite(polledAt)) {
    return true;
  }

  return Date.now() - polledAt >= MAINTENANCE_POLL_INTERVAL_MS;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBypassedPath(pathname)) {
    return NextResponse.next();
  }

  const maintenanceCookie = request.cookies.get(MAINTENANCE_COOKIE)?.value;

  if (maintenanceCookie === "1") {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }

  if (!shouldPollMaintenanceStatus(request)) {
    return NextResponse.next();
  }

  const maintenanceActive = await getMaintenanceEnabled(request);

  if (maintenanceActive) {
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    const response = NextResponse.redirect(url);
    response.cookies.set(MAINTENANCE_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      maxAge: 60,
    });
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set(MAINTENANCE_POLL_COOKIE, String(Date.now()), {
    path: "/",
    sameSite: "lax",
    maxAge: MAINTENANCE_POLL_INTERVAL_MS / 1000,
  });
  if (maintenanceCookie === "1") {
    response.cookies.delete(MAINTENANCE_COOKIE);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
