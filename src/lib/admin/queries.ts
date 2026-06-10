import { prisma } from "@/lib/prisma";

export async function getAdminForumTree() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      forums: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { threads: true },
          },
        },
      },
      _count: {
        select: { forums: true },
      },
    },
  });

  return categories;
}

export async function getAdminCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      forums: {
        include: {
          _count: {
            select: { threads: true },
          },
        },
      },
      _count: {
        select: { forums: true },
      },
    },
  });

  if (!category) {
    return null;
  }

  return {
    ...category,
    threadCount: category.forums.reduce(
      (total, forum) => total + forum._count.threads,
      0
    ),
  };
}

export async function getAdminForumById(id: string) {
  return prisma.forum.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { threads: true },
      },
    },
  });
}

export async function getAdminCategoryOptions() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
    },
  });
}
