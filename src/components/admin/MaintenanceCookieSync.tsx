"use client";

import { useEffect } from "react";

/** Keeps middleware maintenance cookie in sync with DB state. */
export function MaintenanceCookieSync() {
  useEffect(() => {
    fetch("/api/internal/maintenance-status")
      .then((res) => res.json())
      .then((data: { enabled: boolean }) => {
        const pathname = window.location.pathname;
        const onAdmin = pathname.startsWith("/admin");
        const onMaintenance = pathname === "/maintenance";

        if (data.enabled) {
          document.cookie = "dr_maintenance=1; path=/; max-age=60; samesite=lax";
          if (!onAdmin && !onMaintenance) {
            window.location.replace("/maintenance");
          }
        } else {
          document.cookie = "dr_maintenance=; path=/; max-age=0; samesite=lax";
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
