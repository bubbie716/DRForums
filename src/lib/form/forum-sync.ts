import { prisma } from "@/lib/prisma";

/**
 * Form forums: everyone can view/read their own submission thread and reply on it.
 * Reviewer roles see all submissions and can reply to any of them.
 */
export async function syncFormForumPermissions(
  forumId: string,
  reviewerRoleIds: string[]
): Promise<void> {
  const reviewerSet = new Set(reviewerRoleIds);
  const roles = await prisma.appRole.findMany({
    select: { id: true },
  });

  await prisma.$transaction(
    roles.map((role) => {
      const isReviewer = reviewerSet.has(role.id);

      return prisma.forumRolePermission.upsert({
        where: {
          roleId_forumId: {
            roleId: role.id,
            forumId,
          },
        },
        create: {
          roleId: role.id,
          forumId,
          canView: true,
          canRead: true,
          canCreateThreads: false,
          canReply: isReviewer,
          canViewOtherThreads: isReviewer,
          canModerate: false,
        },
        update: {
          canView: true,
          canRead: true,
          canCreateThreads: false,
          canReply: isReviewer,
          canViewOtherThreads: isReviewer,
          canModerate: false,
        },
      });
    })
  );
}
