import { UserAvatar } from "@/components/profile/UserAvatar";

export type Recipient = {
  id: string;
  username: string;
  minecraftUsername: string | null;
  avatarUrl: string | null;
};

type RecipientChipProps = {
  recipient: Recipient;
  onRemove: () => void;
};

export function RecipientChip({ recipient, onRemove }: RecipientChipProps) {
  return (
    <span className="inline-flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-xl bg-white border border-border shadow-sm max-w-full">
      <UserAvatar
        seed={recipient.id}
        avatarUrl={recipient.avatarUrl}
        minecraftUsername={recipient.minecraftUsername}
        size={28}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-text-dark truncate">
          {recipient.username}
        </span>
        {recipient.minecraftUsername && (
          <span className="block text-[11px] text-text-secondary truncate">
            {recipient.minecraftUsername}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${recipient.username}`}
        className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-lg text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </span>
  );
}
