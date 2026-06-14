"use client";

import { useEffect, useMemo, useState } from "react";
import { BBCodeEditor } from "@/components/forum/BBCodeEditor";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { UserSignature } from "@/components/profile/UserSignature";
import {
  useUnsavedChangesFlag,
  useUnsavedChangesForm,
} from "@/components/shared/unsaved-changes/UnsavedChangesProvider";
import { saveProfileSignature } from "@/lib/profile/actions";
import {
  getProfileTextLength,
  SIGNATURE_MAX_LENGTH,
} from "@/lib/profile/text";

type SignatureSettingsSectionProps = {
  signature: string | null;
  signatureEnabled: boolean;
  canUseSignature: boolean;
};

export function SignatureSettingsSection({
  signature,
  signatureEnabled,
  canUseSignature,
}: SignatureSettingsSectionProps) {
  const initialSignature = signature ?? "";
  const [value, setValue] = useState(initialSignature);
  const [signatureBaseline, setSignatureBaseline] = useState(initialSignature);
  const [enabled, setEnabled] = useState(signatureEnabled);
  const [enabledBaseline, setEnabledBaseline] = useState(signatureEnabled);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { markSaved } = useUnsavedChangesForm("profile-signature");

  const charCount = useMemo(() => getProfileTextLength(value), [value]);
  const isSignatureDirty =
    value !== signatureBaseline || enabled !== enabledBaseline;

  useUnsavedChangesFlag("profile-signature", canUseSignature && isSignatureDirty);

  useEffect(() => {
    const nextSignature = signature ?? "";
    if (value === signatureBaseline && enabled === enabledBaseline) {
      setSignatureBaseline(nextSignature);
      setValue(nextSignature);
      setEnabledBaseline(signatureEnabled);
      setEnabled(signatureEnabled);
    }
  }, [signature, signatureEnabled, signatureBaseline, enabledBaseline, value, enabled]);

  if (!canUseSignature) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result = await saveProfileSignature(value, enabled);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSignatureBaseline(value);
    setEnabledBaseline(enabled);
    markSaved();
    setSuccess(result.message ?? "Signature saved.");
  }

  return (
    <div className="mt-8 bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
      <div className="px-6 py-4 bg-surface border-b border-border">
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
          Signature
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
        {error ? (
          <div
            role="alert"
            className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            role="status"
            className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm"
          >
            {success}
          </div>
        ) : null}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span className="text-sm font-semibold text-text-dark">
            Show signature under my posts and messages
          </span>
        </label>

        <div>
          <FieldLabel>Signature text</FieldLabel>
          <BBCodeEditor
            id="signature"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={4}
            placeholder="A short sign-off shown under your forum posts and DMs…"
          />
          <p className="mt-1 text-xs text-text-secondary tabular-nums">
            {charCount}/{SIGNATURE_MAX_LENGTH} characters (BBCode tags don&apos;t
            count)
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface/50 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
            Preview
          </p>
          <div className="text-sm text-text-primary">Example post content…</div>
          {enabled ? (
            <UserSignature signature={value} />
          ) : (
            <p className="mt-3 text-xs text-text-secondary italic">
              Signature hidden while disabled.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save signature"}
        </button>
      </form>
    </div>
  );
}
