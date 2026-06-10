import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreateBanForm } from "@/components/admin/CreateBanForm";
import { requireAdminPermission } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Create Forum Ban · Admin" };

export default async function AdminCreateBanPage() {
  await requireAdminPermission("user.ban");

  return (
    <div className="space-y-6 max-w-2xl">
      <AdminPageHeader
        title="Create Forum Ban"
        description="Block someone from posting and messaging on the website. This does not ban them from Minecraft."
        actions={
          <Link href="/admin/bans" className="text-sm font-semibold text-accent">← Back to forum bans</Link>
        }
      />
      <CreateBanForm />
    </div>
  );
}
