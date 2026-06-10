import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { isRegistrationEnabled } from "@/lib/settings";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
};

export default async function RegisterPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/");
  }

  const registrationEnabled = await isRegistrationEnabled();

  if (!registrationEnabled) {
    return (
      <div className="flex items-center justify-center px-4 py-20 min-h-[calc(100dvh-8rem)] bg-gradient-hero">
        <div className="max-w-md bg-white border border-border rounded-2xl shadow-warm-lg p-8 text-center">
          <h1 className="text-xl font-extrabold text-text-dark">Registration Closed</h1>
          <p className="mt-3 text-text-secondary">
            New account registration is currently disabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-20 min-h-[calc(100dvh-8rem)] md:min-h-[calc(100dvh-12rem)] bg-gradient-hero">
      <RegisterForm />
    </div>
  );
}
