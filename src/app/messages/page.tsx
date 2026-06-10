import Link from "next/link";
import { ConversationList } from "@/components/messages/ConversationList";
import { getSessionUser } from "@/lib/auth";
import { getConversationList } from "@/lib/messages/queries";

export default async function MessagesPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const conversations = await getConversationList(user.id);

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-text-dark">Messages</h1>
            <p className="text-text-secondary mt-1">
              Private conversations with forum members
            </p>
          </div>
          <Link
            href="/messages/new"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Compose
          </Link>
        </div>

        <div className="mt-8">
          <ConversationList
            conversations={conversations}
            emptyTitle="Your inbox is empty"
            emptyDescription="Start a private conversation with another member."
          />
        </div>
      </div>
    </div>
  );
}
