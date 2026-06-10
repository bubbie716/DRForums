"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CODE_PREFIX } from "@/lib/minecraft-verification";

export function LinkMinecraftForm() {
  const router = useRouter();
  const [codeDigits, setCodeDigits] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const code = `${CODE_PREFIX}${codeDigits}`;

    try {
      const response = await fetch("/api/settings/link-minecraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to link Minecraft account.");
        return;
      }

      setSuccess("Minecraft account linked successfully.");
      setCodeDigits("");
      router.refresh();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm"
        >
          {success}
        </div>
      )}

      <p className="text-sm text-text-secondary leading-relaxed">
        Join the District Roleplay Minecraft server and run{" "}
        <code className="px-1.5 py-0.5 rounded-md bg-yellow/40 text-accent-dark font-semibold text-xs">
          /forumsverify
        </code>
        . Enter the code shown in chat below.
      </p>

      <div className="space-y-2">
        <label
          htmlFor="verificationCode"
          className="block text-sm font-bold text-text-dark"
        >
          Verification code
        </label>
        <div className="inline-flex items-stretch rounded-xl border border-border bg-cream overflow-hidden focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
          <span className="inline-flex items-center px-3 py-2.5 bg-yellow/30 border-r border-border text-accent-dark text-sm font-bold tracking-widest shrink-0">
            {CODE_PREFIX}
          </span>
          <input
            id="verificationCode"
            name="verificationCode"
            type="text"
            inputMode="numeric"
            required
            minLength={6}
            maxLength={6}
            pattern="\d{6}"
            value={codeDigits}
            onChange={(e) =>
              setCodeDigits(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            className="w-[7.5rem] px-3 py-2.5 bg-transparent text-text-dark text-sm text-center placeholder:text-text-muted focus:outline-none tracking-[0.2em] font-semibold"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
      >
        {loading ? "Linking…" : "Link Minecraft Account"}
      </button>
    </form>
  );
}
