import { UserProfileLink } from "@/components/profile/UserProfileLink";
import { cn } from "@/lib/utils";

type ConversationParticipant = {
  username: string;
};

type ConversationParticipantsProps = {
  participants: ConversationParticipant[];
  className?: string;
  linkClassName?: string;
  onParticipantClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export function ConversationParticipants({
  participants,
  className,
  linkClassName,
  onParticipantClick,
}: ConversationParticipantsProps) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline", className)}>
      {participants.map((participant, index) => (
        <span key={participant.username}>
          {index > 0 && ", "}
          <UserProfileLink
            username={participant.username}
            className={cn("font-semibold text-text-dark", linkClassName)}
            onClick={onParticipantClick}
          />
        </span>
      ))}
    </span>
  );
}
