export type PollCreateInput = {
  question: string;
  options: string[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  closesAt?: string | null;
};

export type PollOptionResult = {
  id: string;
  label: string;
  sortOrder: number;
  voteCount: number;
  percentage: number;
  voters: { id: string; username: string }[];
};

export type ThreadPollView = {
  id: string;
  threadId: string;
  question: string;
  allowMultiple: boolean;
  closesAt: string | null;
  isClosed: boolean;
  isAnonymous: boolean;
  createdById: string;
  createdAt: string;
  totalVoters: number;
  totalVotes: number;
  options: PollOptionResult[];
  userVotedOptionIds: string[];
  canVote: boolean;
  isBanned: boolean;
  canCloseOwn: boolean;
  canManage: boolean;
};
