"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { buildQuoteMarkup } from "@/lib/quoteParser";

export type QuoteReplyTarget = {
  username: string;
  content: string;
  replyToPostId?: string;
  replyToMessageId?: string;
};

type QuoteReplyPayload = {
  quoteText: string;
  replyToPostId?: string;
  replyToMessageId?: string;
};

type ReplyHandler = (payload: QuoteReplyPayload) => void;

type QuoteReplyContextValue = {
  requestQuoteReply: (target: QuoteReplyTarget) => void;
  registerReplyHandler: (handler: ReplyHandler) => () => void;
};

const QuoteReplyContext = createContext<QuoteReplyContextValue | null>(null);

type QuoteReplyProviderProps = {
  children: ReactNode;
  replyFormId?: string;
};

export function QuoteReplyProvider({
  children,
  replyFormId = "reply-form",
}: QuoteReplyProviderProps) {
  const handlerRef = useRef<ReplyHandler | null>(null);

  const registerReplyHandler = useCallback((handler: ReplyHandler) => {
    handlerRef.current = handler;
    return () => {
      if (handlerRef.current === handler) {
        handlerRef.current = null;
      }
    };
  }, []);

  const requestQuoteReply = useCallback(
    (target: QuoteReplyTarget) => {
      const quoteText = buildQuoteMarkup(target.username, target.content);

      handlerRef.current?.({
        quoteText,
        replyToPostId: target.replyToPostId,
        replyToMessageId: target.replyToMessageId,
      });

      const formElement = document.getElementById(replyFormId);
      formElement?.scrollIntoView({ behavior: "smooth", block: "center" });

      window.setTimeout(() => {
        const textarea = formElement?.querySelector("textarea");
        textarea?.focus();
      }, 300);
    },
    [replyFormId]
  );

  return (
    <QuoteReplyContext.Provider
      value={{ requestQuoteReply, registerReplyHandler }}
    >
      {children}
    </QuoteReplyContext.Provider>
  );
}

export function useQuoteReply(): QuoteReplyContextValue {
  const context = useContext(QuoteReplyContext);
  if (!context) {
    throw new Error("useQuoteReply must be used within QuoteReplyProvider");
  }
  return context;
}
