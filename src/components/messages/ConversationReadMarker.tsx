"use client";

import { useEffect, useRef } from "react";
import { refreshMessagesAfterRead } from "@/lib/messages/actions";

type ConversationReadMarkerProps = {
  conversationId: string;
};

export function ConversationReadMarker({
  conversationId,
}: ConversationReadMarkerProps) {
  const hasRefreshed = useRef(false);

  useEffect(() => {
    if (hasRefreshed.current) {
      return;
    }

    hasRefreshed.current = true;
    void refreshMessagesAfterRead(conversationId);
  }, [conversationId]);

  return null;
}
