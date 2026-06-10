import Link from "next/link";
import { cn } from "@/lib/utils";

type UserProfileLinkProps = {
  username: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export function UserProfileLink({
  username,
  children,
  className,
  onClick,
}: UserProfileLinkProps) {
  return (
    <Link
      href={`/profile/${username}`}
      onClick={onClick}
      className={cn(
        "profile-name profile-link forum-title-link transition-colors duration-200",
        className
      )}
    >
      {children ?? username}
    </Link>
  );
}
