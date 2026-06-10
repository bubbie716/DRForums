import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const forums = await prisma.$queryRaw<
    { id: string; name: string; categoryId: string }[]
  >`SELECT id, name, "categoryId" FROM forums`;

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  for (const forum of forums) {
    const categoryName = categoryMap.get(forum.categoryId) ?? "forum";
    const slug = `${slugify(categoryName)}-${slugify(forum.name)}`;

    await prisma.$executeRaw`
      UPDATE forums SET slug = ${slug} WHERE id = ${forum.id}
    `;
  }

  console.log(`Updated ${forums.length} forum slugs.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
