import { NextResponse } from "next/server";
import { isMaintenanceModeEnabled, getSetting, SETTING_KEYS } from "@/lib/settings";

export async function GET() {
  const enabled = await isMaintenanceModeEnabled();
  const message = await getSetting(SETTING_KEYS.maintenanceMessage);

  return NextResponse.json({ enabled, message });
}
