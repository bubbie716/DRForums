import { cookies } from "next/headers";

export const MAINTENANCE_COOKIE = "dr_maintenance";

export async function setMaintenanceCookie(enabled: boolean): Promise<void> {
  const cookieStore = await cookies();

  if (enabled) {
    cookieStore.set(MAINTENANCE_COOKIE, "1", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    cookieStore.delete(MAINTENANCE_COOKIE);
  }
}
