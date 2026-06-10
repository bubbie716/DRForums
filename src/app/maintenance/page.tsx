import Image from "next/image";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

export default async function MaintenancePage() {
  const message = await getSetting(SETTING_KEYS.maintenanceMessage);

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center px-4 py-16 bg-gradient-hero">
      <div className="max-w-lg w-full bg-white border border-border rounded-2xl shadow-warm-lg p-8 md:p-10 text-center">
        <Image
          src="/district-roleplay-logo.png"
          alt="District Roleplay"
          width={72}
          height={72}
          className="mx-auto rounded-2xl shadow-warm mb-6"
        />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">
          Maintenance
        </p>
        <h1 className="text-2xl font-extrabold text-text-dark mb-4">
          We&apos;ll be back soon
        </h1>
        <p className="text-text-secondary leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
