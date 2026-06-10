import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedPermissionsRolesSettings } from "./seed-permissions";
import { SYSTEM_ROLE_SLUGS } from "../src/lib/system-roles";

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type SeedForum = {
  name: string;
  description: string;
  sortOrder: number;
};

type SeedCategory = {
  name: string;
  description: string;
  sortOrder: number;
  forums: SeedForum[];
};

const categories: SeedCategory[] = [
  {
    name: "District Roleplay",
    description: "Official information about the District Roleplay server and community.",
    sortOrder: 1,
    forums: [
      {
        name: "Announcements",
        description: "Official server announcements and important updates.",
        sortOrder: 1,
      },
      {
        name: "Rules & Guidelines",
        description: "Server rules, roleplay standards, and community guidelines.",
        sortOrder: 2,
      },
      {
        name: "Welcome & Introductions",
        description: "New members introduce themselves to the community.",
        sortOrder: 3,
      },
      {
        name: "Server Information",
        description: "Connection details, schedules, and general server information.",
        sortOrder: 4,
      },
    ],
  },
  {
    name: "City Hall",
    description: "Municipal government, legislation, and official city business.",
    sortOrder: 2,
    forums: [
      {
        name: "Mayor's Office",
        description: "Executive orders, proclamations, and mayoral announcements.",
        sortOrder: 1,
      },
      {
        name: "City Council",
        description: "Council meetings, agendas, minutes, and legislative discussion.",
        sortOrder: 2,
      },
      {
        name: "Municipal Records",
        description: "Public records, ordinances, and official city documentation.",
        sortOrder: 3,
      },
      {
        name: "Press & Media",
        description: "Press releases, media inquiries, and public communications.",
        sortOrder: 4,
      },
    ],
  },
  {
    name: "Departments",
    description: "City departments, public services, and emergency operations.",
    sortOrder: 3,
    forums: [
      {
        name: "Police Department",
        description: "Law enforcement operations, reports, and departmental business.",
        sortOrder: 1,
      },
      {
        name: "Fire & Rescue",
        description: "Fire suppression, rescue operations, and incident reports.",
        sortOrder: 2,
      },
      {
        name: "Emergency Medical Services",
        description: "Medical response, hospital coordination, and EMS operations.",
        sortOrder: 3,
      },
      {
        name: "Public Works",
        description: "Infrastructure, utilities, roads, and city maintenance.",
        sortOrder: 4,
      },
      {
        name: "Judicial & Courts",
        description: "Court proceedings, legal matters, and judicial administration.",
        sortOrder: 5,
      },
    ],
  },
  {
    name: "Business District",
    description: "Commerce, enterprise, and economic activity in the district.",
    sortOrder: 4,
    forums: [
      {
        name: "Local Businesses",
        description: "Business listings, openings, and commercial announcements.",
        sortOrder: 1,
      },
      {
        name: "Employment & Hiring",
        description: "Job postings, applications, and workforce opportunities.",
        sortOrder: 2,
      },
      {
        name: "Real Estate",
        description: "Property listings, leases, and real estate transactions.",
        sortOrder: 3,
      },
      {
        name: "Trade & Commerce",
        description: "Contracts, partnerships, and commercial negotiations.",
        sortOrder: 4,
      },
    ],
  },
  {
    name: "Community",
    description: "Resident discussion, events, and roleplay storytelling.",
    sortOrder: 5,
    forums: [
      {
        name: "General Discussion",
        description: "Open conversation about life and events in the district.",
        sortOrder: 1,
      },
      {
        name: "Events & Activities",
        description: "Community events, gatherings, and scheduled activities.",
        sortOrder: 2,
      },
      {
        name: "Roleplay Archives",
        description: "Stories, character development, and session records.",
        sortOrder: 3,
      },
      {
        name: "Off-Duty Lounge",
        description: "Casual conversation outside of active roleplay.",
        sortOrder: 4,
      },
    ],
  },
  {
    name: "Support",
    description: "Help, reports, appeals, and staff-related requests.",
    sortOrder: 6,
    forums: [
      {
        name: "Help Desk",
        description: "General questions and assistance with the forum or server.",
        sortOrder: 1,
      },
      {
        name: "Bug Reports",
        description: "Report technical issues with the forum or game server.",
        sortOrder: 2,
      },
      {
        name: "Appeals",
        description: "Submit and review moderation or ban appeals.",
        sortOrder: 3,
      },
      {
        name: "Staff Applications",
        description: "Apply for moderator or departmental staff positions.",
        sortOrder: 4,
      },
    ],
  },
];

async function main() {
  const adminPassword = await bcrypt.hash("changeme123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
    create: {
      username: "admin",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  for (const category of categories) {
    const { forums, ...categoryData } = category;
    const categoryId = `seed-${slugify(category.name)}`;

    const categorySlug = slugify(category.name);

    const createdCategory = await prisma.category.upsert({
      where: { id: categoryId },
      update: {
        ...categoryData,
        slug: categorySlug,
        isVisible: true,
      },
      create: {
        id: categoryId,
        slug: categorySlug,
        isVisible: true,
        ...categoryData,
      },
    });

    for (const forum of forums) {
      const forumId = `seed-${slugify(category.name)}-${slugify(forum.name)}`;
      const forumSlug = `${slugify(category.name)}-${slugify(forum.name)}`;

      await prisma.forum.upsert({
        where: { id: forumId },
        update: {
          ...forum,
          slug: forumSlug,
          categoryId: createdCategory.id,
          isVisible: true,
          isLocked: false,
        },
        create: {
          id: forumId,
          slug: forumSlug,
          isVisible: true,
          isLocked: false,
          ...forum,
          categoryId: createdCategory.id,
        },
      });
    }
  }

  await seedPermissionsRolesSettings(prisma);

  const founderRole = await prisma.appRole.findUnique({
    where: { slug: SYSTEM_ROLE_SLUGS.FOUNDER },
    select: { id: true },
  });

  if (founderRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: founderRole.id,
        },
      },
      create: {
        userId: admin.id,
        roleId: founderRole.id,
      },
      update: {},
    });
  }

  const categoryCount = categories.length;
  const forumCount = categories.reduce((sum, cat) => sum + cat.forums.length, 0);

  console.log("Seed complete.");
  console.log(`  Admin user: ${admin.username}`);
  console.log(`  Categories: ${categoryCount}`);
  console.log(`  Forums:     ${forumCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
