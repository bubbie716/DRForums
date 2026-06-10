import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
  getConversationForUser,
  setConversationLastReadAt,
} from "@/lib/messages/queries";
import { MessageThread } from "@/components/messages/MessageThread";
import { ConversationReplyForm } from "@/components/messages/ConversationReplyForm";
import { DeleteConversationButton } from "@/components/messages/DeleteConversationButton";
import { ConversationReadMarker } from "@/components/messages/ConversationReadMarker";

type ConversationPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { conversationId } = await params;
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const conversation = await getConversationForUser(conversationId, user.id);

  if (!conversation) {
    notFound();
  }

  await setConversationLastReadAt(conversationId, user.id);

  return (
    <div className="bg-surface min-h-full">
      <ConversationReadMarker conversationId={conversationId} />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/messages"
              className="inline-flex items-center text-sm font-semibold text-text-secondary hover:text-accent transition-colors"
            >
              ← Back to Inbox
            </Link>
            <h1 className="mt-3 text-2xl font-extrabold text-text-dark">
              Conversation with{" "}
              <Link
                href={`/profile/${conversation.otherUser.username}`}
                className="text-accent hover:text-accent-dark transition-colors"
              >
                {conversation.otherUser.username}
              </Link>
            </h1>
          </div>
          <DeleteConversationButton conversationId={conversation.id} />
        </div>

        <div className="mt-8 space-y-6">
          <MessageThread
            messages={conversation.messages}
            currentUserId={user.id}
          />
          <ConversationReplyForm conversationId={conversation.id} />
        </div>
      </div>
    </div>
  );
}
