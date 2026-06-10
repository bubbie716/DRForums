"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function AdminNoticeBanner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const message = searchParams.get("notice");
    setNotice(message ? decodeURIComponent(message) : "");
  }, [searchParams]);

  if (!notice) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-6 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-start justify-between gap-4"
    >
      <span>{notice}</span>
      <button
        type="button"
        onClick={() => {
          setNotice("");
          router.replace(pathname);
        }}
        className="shrink-0 text-green-800 hover:text-green-900 font-semibold"
      >
        Dismiss
      </button>
    </div>
  );
}
