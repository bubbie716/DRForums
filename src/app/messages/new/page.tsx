import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getRecipientByUsername } from "@/lib/messages/queries";
import { ComposeMessageForm } from "@/components/messages/ComposeMessageForm";

type NewMessagePageProps = {
  searchParams: Promise<{ to?: string }>;
};

export default async function NewMessagePage({
  searchParams,
}: NewMessagePageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { to } = await searchParams;
  const initialRecipient = to ? await getRecipientByUsername(to, user.id) : null;

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <Link
          href="/messages"
          className="inline-flex items-center text-sm font-semibold text-text-secondary hover:text-accent transition-colors"
        >
          ← Back to Inbox
        </Link>

        <h1 className="mt-4 text-2xl font-extrabold text-text-dark">
          Compose Message
        </h1>
        <p className="text-text-secondary mt-2">
          Send a private message to another member
        </p>

        <div className="mt-8">
          <ComposeMessageForm
            initialRecipients={
              initialRecipient ? [initialRecipient] : []
            }
          />
        </div>
      </div>
    </div>
  );
}
