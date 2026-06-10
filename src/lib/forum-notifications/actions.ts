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
