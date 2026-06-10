"use server";

import { getSessionUser } from "@/lib/auth";
import { searchUsersByUsername } from "@/lib/messages/queries";

export async function searchMentionUsers(query: string) {
  const user = await getSessionUser();
  if (!user) {
    return [];
  }

  return searchUsersByUsername(query, user.id);
}
