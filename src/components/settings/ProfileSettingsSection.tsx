"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BBCodeEditor } from "@/components/forum/BBCodeEditor";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { ProfileBanner } from "@/components/profile/ProfileBanner";
import { ProfileImageCropModal } from "@/components/settings/ProfileImageCropModal";
import {
  useUnsavedChangesFlag,
  useUnsavedChangesForm,
} from "@/components/shared/unsaved-changes/UnsavedChangesProvider";
import type { ProfileCropKind } from "@/lib/profile/crop";
import {
  removeProfileAvatar,
  removeProfileBanner,
  saveProfileBio,
  uploadProfileAvatar,
  uploadProfileBanner,
} from "@/lib/profile/actions";
import { getProfileTextLength } from "@/lib/profile/text";

type ProfileSettingsSectionProps = {
  userId: string;
  minecraftUsername: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  maxBioLength: number;
  canEditBio: boolean;
  canUploadAvatar: boolean;
  canUploadBanner: boolean;
};

type CropSession = {
  kind: ProfileCropKind;
  file?: File;
  src?: string;
};

export function ProfileSettingsSection({
  userId,
  minecraftUsername,
  bio,
  avatarUrl,
  bannerUrl,
  maxBioLength,
  canEditBio,
  canUploadAvatar,
  canUploadBanner,
}: ProfileSettingsSectionProps) {
  const initialBio = bio ?? "";
  const [bioValue, setBioValue] = useState(initialBio);
  const [bioBaseline, setBioBaseline] = useState(initialBio);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [currentBannerUrl, setCurrentBannerUrl] = useState(bannerUrl);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { markSaved } = useUnsavedChangesForm("profile-bio");

  const bioCount = useMemo(() => getProfileTextLength(bioValue), [bioValue]);
  const isBioDirty = bioValue !== bioBaseline;

  useUnsavedChangesFlag("profile-bio", canEditBio && isBioDirty);

  useEffect(() => {
    setCurrentAvatarUrl(avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    setCurrentBannerUrl(bannerUrl);
  }, [bannerUrl]);

  useEffect(() => {
    const nextBio = bio ?? "";
    if (bioValue === bioBaseline) {
      setBioBaseline(nextBio);
      setBioValue(nextBio);
    }
  }, [bio, bioBaseline, bioValue]);

  function openCropEditorFromFile(kind: ProfileCropKind, file: File) {
    setCropSession({ kind, file });
  }

  function openCropEditorFromUrl(kind: ProfileCropKind, src: string) {
    setCropSession({ kind, src });
  }

  function closeCropSession() {
    setCropSession(null);
  }

  function handleFileSelected(
    kind: ProfileCropKind,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError("");
    setSuccess("");
    openCropEditorFromFile(kind, file);
  }

  async function uploadCroppedFile(kind: ProfileCropKind, file: File) {
    setError("");
    setSuccess("");

    if (kind === "avatar") {
      setAvatarLoading(true);
    } else {
      setBannerLoading(true);
    }

    const formData = new FormData();
    formData.set("file", file);

    const result =
      kind === "avatar"
        ? await uploadProfileAvatar(formData)
        : await uploadProfileBanner(formData);

    if (kind === "avatar") {
      setAvatarLoading(false);
    } else {
      setBannerLoading(false);
    }

    if (!result.success) {
      setError(result.error);
      return;
    }

    closeCropSession();
    if (kind === "avatar") {
      setCurrentAvatarUrl(result.avatarUrl ?? null);
    } else {
      setCurrentBannerUrl(result.bannerUrl ?? null);
    }
    setSuccess(
      result.message ??
        (kind === "avatar" ? "Avatar updated." : "Banner updated.")
    );
  }

  async function handleSaveBio(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result = await saveProfileBio(bioValue);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setBioBaseline(bioValue);
    markSaved();
    setSuccess(result.message ?? "Bio saved.");
  }

  async function handleRemoveAvatar() {
    setError("");
    setSuccess("");
    setAvatarLoading(true);

    const result = await removeProfileAvatar();
    setAvatarLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setCurrentAvatarUrl(null);
    setSuccess(result.message ?? "Avatar removed.");
  }

  async function handleRemoveBanner() {
    setError("");
    setSuccess("");
    setBannerLoading(true);

    const result = await removeProfileBanner();
    setBannerLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setCurrentBannerUrl(null);
    setSuccess(result.message ?? "Banner removed.");
  }

  if (!canEditBio && !canUploadAvatar && !canUploadBanner) {
    return (
      <div className="mt-8 bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
        <div className="px-6 py-4 bg-surface border-b border-border">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
            Public Profile
          </h2>
        </div>
        <div className="px-6 py-6 text-sm text-text-secondary">
          Profile customization is not available on this site.
        </div>
      </div>
    );
  }

  const cropLoading =
    cropSession?.kind === "avatar" ? avatarLoading : bannerLoading;

  return (
    <>
      <ProfileImageCropModal
        open={cropSession !== null}
        imageFile={cropSession?.file ?? null}
        imageSrc={cropSession?.src ?? null}
        kind={cropSession?.kind ?? "avatar"}
        loading={cropLoading}
        onClose={closeCropSession}
        onConfirm={(file) => {
          if (!cropSession) {
            return;
          }
          void uploadCroppedFile(cropSession.kind, file);
        }}
      />

      <div className="mt-8 bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
        <div className="px-6 py-4 bg-surface border-b border-border">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest">
            Public Profile
          </h2>
        </div>

        <div className="px-6 py-6 space-y-6">
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

          {(canUploadAvatar || canUploadBanner) && (
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="relative">
                <ProfileBanner
                  bannerUrl={currentBannerUrl}
                  className="rounded-none relative z-0"
                />
                <div className="absolute left-4 sm:left-6 bottom-0 z-10 translate-y-1/2">
                  <UserAvatar
                    seed={userId}
                    avatarUrl={currentAvatarUrl}
                    minecraftUsername={minecraftUsername}
                    size={72}
                    square
                    imageClassName="ring-4 ring-white"
                  />
                </div>
              </div>
              <div className="px-4 sm:px-6 pt-10 pb-5 flex flex-col sm:flex-row sm:items-end gap-4 bg-surface/40">
                <div className="flex flex-wrap gap-2 sm:ml-[4.5rem]">
                  {canUploadAvatar ? (
                    <>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarLoading}
                        className="inline-flex items-center justify-center min-h-10 px-4 py-2 text-sm font-bold rounded-xl bg-gradient-orange text-white hover:shadow-warm transition-all disabled:opacity-60"
                      >
                        {avatarLoading ? "Saving…" : "Upload avatar"}
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="sr-only"
                        disabled={avatarLoading}
                        onChange={(event) => handleFileSelected("avatar", event)}
                      />
                      {currentAvatarUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openCropEditorFromUrl("avatar", currentAvatarUrl)
                            }
                            disabled={avatarLoading}
                            className="min-h-10 px-4 py-2 text-sm font-bold rounded-xl border border-border text-text-dark hover:bg-surface transition-colors disabled:opacity-60"
                          >
                            Adjust avatar
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            disabled={avatarLoading}
                            className="min-h-10 px-4 py-2 text-sm font-bold rounded-xl border border-border text-text-dark hover:bg-surface transition-colors disabled:opacity-60"
                          >
                            Remove avatar
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : null}
                  {canUploadBanner ? (
                    <>
                      <button
                        type="button"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={bannerLoading}
                        className="inline-flex items-center justify-center min-h-10 px-4 py-2 text-sm font-bold rounded-xl border border-accent/30 text-accent-dark bg-yellow/20 hover:bg-yellow/30 transition-colors disabled:opacity-60"
                      >
                        {bannerLoading ? "Saving…" : "Upload banner"}
                      </button>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="sr-only"
                        disabled={bannerLoading}
                        onChange={(event) => handleFileSelected("banner", event)}
                      />
                      {currentBannerUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openCropEditorFromUrl("banner", currentBannerUrl)
                            }
                            disabled={bannerLoading}
                            className="min-h-10 px-4 py-2 text-sm font-bold rounded-xl border border-border text-text-dark hover:bg-surface transition-colors disabled:opacity-60"
                          >
                            Adjust banner
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveBanner}
                            disabled={bannerLoading}
                            className="min-h-10 px-4 py-2 text-sm font-bold rounded-xl border border-border text-text-dark hover:bg-surface transition-colors disabled:opacity-60"
                          >
                            Remove banner
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
              <p className="px-4 sm:px-6 pb-4 text-xs text-text-secondary">
                Avatar exports as 256×256. Banner exports as 960×240. Original
                uploads up to 2MB (avatar) or 5MB (banner).
              </p>
            </div>
          )}

          {canEditBio ? (
            <form onSubmit={handleSaveBio} className="space-y-3">
              <div>
                <FieldLabel>Bio</FieldLabel>
                <BBCodeEditor
                  id="bio"
                  value={bioValue}
                  onChange={(event) => setBioValue(event.target.value)}
                  rows={5}
                  placeholder="Tell the community a little about yourself…"
                />
                <p className="mt-1 text-xs text-text-secondary tabular-nums">
                  {bioCount}/{maxBioLength} characters (BBCode tags don&apos;t
                  count)
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save profile"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </>
  );
}
