import Link from "next/link";
import type { ConversationListItem } from "@/lib/messages/queries";
import { ConversationListRow } from "@/components/messages/ConversationListRow";

type ConversationListProps = {
  conversations: ConversationListItem[];
  emptyTitle: string;
  emptyDescription: string;
};

export function ConversationList({
  conversations,
  emptyTitle,
  emptyDescription,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-warm px-8 py-16 text-center">
        <h3 className="text-lg font-bold text-text-dark">{emptyTitle}</h3>
        <p className="text-text-secondary mt-2 max-w-md mx-auto">
          {emptyDescription}
        </p>
        <Link
          href="/messages/new"
          className="inline-block mt-6 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all duration-200"
        >
          Compose Message
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden divide-y divide-border/60">
      {conversations.map((conversation) => (
        <ConversationListRow
          key={conversation.id}
          conversation={conversation}
        />
      ))}
    </div>
  );
}
