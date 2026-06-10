import Image from "next/image";
import Link from "next/link";
import { CopyServerButton } from "./CopyServerButton";
import { HeroBrandWatermark } from "./HeroBrandWatermark";

type HeroSectionProps = {
  isLoggedIn: boolean;
};

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-hero border-b border-border min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] md:min-h-[calc(100dvh-5rem-env(safe-area-inset-top,0px))] flex flex-col justify-center">
      <HeroBrandWatermark />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 lg:py-16">
        <div className="max-w-xl lg:max-w-2xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.5rem] font-extrabold text-text-dark leading-[1.1] tracking-tight">
            <span className="block">Welcome to</span>
            <span className="block mt-1 text-gradient-orange">District Roleplay</span>
          </h1>
          <p className="mt-5 md:mt-7 text-base sm:text-lg lg:text-xl text-text-secondary leading-relaxed max-w-lg">
            The official community forum for our city. Connect, discuss, and
            stay updated with everything happening in District Roleplay.
          </p>

          <div className="mt-8 md:mt-12 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            {isLoggedIn ? (
              <Link
                href="#forums"
                className="inline-flex min-h-11 items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-orange text-white font-bold rounded-2xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Browse Forums
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-orange text-white font-bold rounded-2xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Join the Community
              </Link>
            )}
            <CopyServerButton />
          </div>

          <div className="mt-8 flex justify-center lg:hidden" aria-hidden="true">
            <Image
              src="/district-roleplay-logo.png"
              alt=""
              width={112}
              height={112}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-contain shadow-warm opacity-90"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
