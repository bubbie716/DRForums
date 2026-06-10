import Image from "next/image";
import Link from "next/link";

export function AuthBrand() {
  return (
    <Link href="/" className="flex flex-col items-center group">
      <Image
        src="/district-roleplay-logo.png"
        alt="District Roleplay"
        width={64}
        height={64}
        className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-contain shadow-warm-lg group-hover:shadow-warm transition-shadow duration-300"
        priority
      />
      <h1 className="mt-4 sm:mt-5 text-xl sm:text-2xl font-extrabold text-text-dark tracking-tight">
        District Roleplay
      </h1>
      <p className="text-sm text-text-secondary mt-1">Community Forum</p>
    </Link>
  );
}
