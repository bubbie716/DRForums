import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyFormPage({ params }: Props) {
  const { slug } = await params;

  const form = await prisma.form.findUnique({
    where: { slug },
    select: { forum: { select: { slug: true } } },
  });

  if (!form) {
    notFound();
  }

  redirect(`/forum/${form.forum.slug}`);
}
