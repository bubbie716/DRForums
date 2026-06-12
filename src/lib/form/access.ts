import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/permissions";

const FORM_STAFF_PERMISSIONS = [
  "form.create",
  "form.edit",
  "form.viewResponses",
  "form.manageResponses",
];

export async function requireFormStaffAccess() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const allowed = await hasAnyPermission(user.id, FORM_STAFF_PERMISSIONS);
  if (!allowed) {
    redirect("/access-denied");
  }

  return user;
}

export async function canAccessFormAdmin(userId: string): Promise<boolean> {
  return hasAnyPermission(userId, FORM_STAFF_PERMISSIONS);
}
