import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border bg-cream mt-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <Image
              src="/district-roleplay-logo.png"
              alt="District Roleplay"
              width={44}
              height={44}
              className="rounded-xl object-contain shadow-warm"
            />
            <div>
              <p className="font-bold text-text-dark">
                District Roleplay
              </p>
              <p className="text-sm text-text-secondary mt-0.5">
                Community Forum
              </p>
            </div>
          </div>
          <p className="text-sm text-text-secondary text-center sm:text-right max-w-md leading-relaxed">
            &copy; {new Date().getFullYear()} District Roleplay. The official
            community forum for city administration and civic discussion.
          </p>
        </div>
      </div>
    </footer>
  );
}
