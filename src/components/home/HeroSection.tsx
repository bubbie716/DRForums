import Link from "next/link";
import { CopyServerButton } from "./CopyServerButton";
import { HeroBrandWatermark } from "./HeroBrandWatermark";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero border-b border-border min-h-[calc(100dvh-5rem)] flex flex-col justify-center">
      <HeroBrandWatermark />

      <div className="relative w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="max-w-xl lg:max-w-2xl">
          <h1 className="text-4xl lg:text-5xl xl:text-[3.5rem] font-extrabold text-text-dark leading-[1.1] tracking-tight">
            <span className="block">Welcome to</span>
            <span className="block mt-1 text-gradient-orange">District Roleplay</span>
          </h1>
          <p className="mt-7 text-lg lg:text-xl text-text-secondary leading-relaxed max-w-lg">
            The official community forum for our city. Connect, discuss, and
            stay updated with everything happening in District Roleplay.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              href="#forums"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-orange text-white font-bold rounded-2xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <svg
                className="w-5 h-5"
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
            <CopyServerButton />
          </div>
        </div>
      </div>
    </section>
  );
}
