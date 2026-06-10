import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
};

export default async function RegisterPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-20 min-h-[calc(100dvh-8rem)] md:min-h-[calc(100dvh-12rem)] bg-gradient-hero">
      <RegisterForm />
    </div>
  );
}
