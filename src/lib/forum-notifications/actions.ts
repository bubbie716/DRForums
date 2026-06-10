"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markForumNotificationAsRead(
  notificationId: string
): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    return;
  }

  await prisma.forumNotification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/messages");
}

export type ClearAllForumNotificationsResult =
  | { success: true }
  | { success: false; error: string };

export async function clearAllForumNotifications(): Promise<ClearAllForumNotificationsResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  await prisma.forumNotification.deleteMany({
    where: { userId: user.id },
  });

  revalidatePath("/messages");
  revalidatePath("/", "layout");
  return { success: true };
}
