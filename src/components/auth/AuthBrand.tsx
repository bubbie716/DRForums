import Image from "next/image";
import Link from "next/link";

export function AuthBrand() {
  return (
    <Link href="/" className="flex flex-col items-center group">
      <Image
        src="/district-roleplay-logo.png"
        alt="District Roleplay"
        width={80}
        height={80}
        className="rounded-2xl object-contain shadow-warm-lg group-hover:shadow-warm transition-shadow duration-300"
        priority
      />
      <h1 className="mt-5 text-2xl font-extrabold text-text-dark tracking-tight">
        District Roleplay
      </h1>
      <p className="text-sm text-text-secondary mt-1">Community Forum</p>
    </Link>
  );
}
