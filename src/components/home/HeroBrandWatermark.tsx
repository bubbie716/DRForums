import Image from "next/image";

export function HeroBrandWatermark() {
  return (
    <div
      className="absolute inset-y-0 right-0 w-[58%] hidden lg:flex items-center justify-center pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-[radial-gradient(circle,rgba(245,213,138,0.35)_0%,rgba(226,144,39,0.06)_55%,transparent_75%)]" />

      <Image
        src="/district-roleplay-logo-transparent.png"
        alt=""
        width={520}
        height={520}
        className="relative object-contain opacity-[0.18] blur-[1px] select-none"
        priority
      />
    </div>
  );
}
