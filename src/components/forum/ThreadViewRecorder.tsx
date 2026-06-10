"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { recordThreadView } from "@/lib/forum/actions";

type ThreadViewRecorderProps = {
  threadId: string;
};

export function ThreadViewRecorder({ threadId }: ThreadViewRecorderProps) {
  const router = useRouter();
  const recordedRef = useRef(false);

  useEffect(() => {
    if (recordedRef.current) {
      return;
    }
    recordedRef.current = true;

    recordThreadView(threadId).then((result) => {
      if (result.recorded) {
        router.refresh();
      }
    });
  }, [threadId, router]);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) {
        return;
      }

      router.refresh();
    }

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [threadId, router]);

  return null;
}
