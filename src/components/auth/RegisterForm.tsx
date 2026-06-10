"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "./AuthCard";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputLgClassName } from "@/components/ui/fieldStyles";
import { PasswordInput } from "./PasswordInput";

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create account"
      subtitle="Join the District Roleplay community."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-accent hover:text-accent-hover font-bold transition-colors"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <FieldLabel>Username</FieldLabel>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className={formInputLgClassName}
            placeholder="your_username"
          />
          <p className="text-xs text-text-secondary">
            3–20 characters. Lowercase letters, numbers, and underscores only.
          </p>
        </div>

        <div className="space-y-2">
          <FieldLabel>Password</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-text-secondary">Minimum 8 characters.</p>
        </div>

        <div className="space-y-2">
          <FieldLabel>Confirm password</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-orange text-white font-bold hover:shadow-warm-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
