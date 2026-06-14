import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { del, put } from "@vercel/blob";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

const BLOB_PATH_PREFIX: Record<ProfileImageKind, string> = {
  avatar: "avatars",
  banner: "banners",
};

export type ProfileImageKind = "avatar" | "banner";

export const PROFILE_IMAGE_LIMITS: Record<
  ProfileImageKind,
  { maxBytes: number; folder: string; urlPrefix: string }
> = {
  avatar: {
    maxBytes: 2 * 1024 * 1024,
    folder: "avatars",
    urlPrefix: "/uploads/avatars",
  },
  banner: {
    maxBytes: 5 * 1024 * 1024,
    folder: "banners",
    urlPrefix: "/uploads/banners",
  },
};

function shouldUseBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function detectImageExtension(buffer: Buffer): string | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return ".png";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return ".jpg";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp";
  }

  return null;
}

function isLocalProfileUploadUrl(url: string): boolean {
  return (
    url.startsWith("/uploads/avatars/") || url.startsWith("/uploads/banners/")
  );
}

function isBlobProfileUploadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return false;
    }

    if (!parsed.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return false;
    }

    const pathname = parsed.pathname.replace(/^\/+/, "");
    return (
      pathname.startsWith("avatars/") || pathname.startsWith("banners/")
    );
  } catch {
    return false;
  }
}

export function isManagedProfileUploadUrl(
  url: string | null | undefined
): url is string {
  if (!url) {
    return false;
  }

  return isLocalProfileUploadUrl(url) || isBlobProfileUploadUrl(url);
}

async function deleteLocalProfileUpload(url: string): Promise<void> {
  const relative = url.replace(/^\/uploads\//, "");
  const filePath = path.join(UPLOAD_ROOT, relative);

  try {
    await unlink(filePath);
  } catch {
    // File may already be gone.
  }
}

async function deleteBlobProfileUpload(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // Blob may already be gone.
  }
}

export async function deleteManagedProfileUpload(
  url: string | null | undefined
): Promise<void> {
  if (!url) {
    return;
  }

  if (isLocalProfileUploadUrl(url)) {
    await deleteLocalProfileUpload(url);
    return;
  }

  if (isBlobProfileUploadUrl(url)) {
    await deleteBlobProfileUpload(url);
  }
}

async function saveLocalProfileImageUpload(
  buffer: Buffer,
  kind: ProfileImageKind,
  detectedExt: string
): Promise<{ url: string }> {
  const limits = PROFILE_IMAGE_LIMITS[kind];
  const filename = `${randomUUID()}${detectedExt}`;
  const directory = path.join(UPLOAD_ROOT, limits.folder);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);

  return { url: `${limits.urlPrefix}/${filename}` };
}

async function saveBlobProfileImageUpload(
  buffer: Buffer,
  kind: ProfileImageKind,
  detectedExt: string,
  contentType: string
): Promise<{ url: string }> {
  const filename = `${randomUUID()}${detectedExt}`;
  const pathname = `${BLOB_PATH_PREFIX[kind]}/${filename}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });

  return { url: blob.url };
}

export async function saveProfileImageUpload(
  file: File,
  kind: ProfileImageKind
): Promise<{ url: string } | { error: string }> {
  const limits = PROFILE_IMAGE_LIMITS[kind];

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "Only PNG, JPG, JPEG, and WEBP images are allowed." };
  }

  if (file.size > limits.maxBytes) {
    const maxMb = limits.maxBytes / (1024 * 1024);
    return { error: `Image must be ${maxMb}MB or smaller.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedExt = detectImageExtension(buffer);

  if (!detectedExt) {
    return { error: "Invalid image file." };
  }

  const expectedExt = EXTENSION_BY_MIME[file.type];
  if (expectedExt && expectedExt !== detectedExt) {
    return { error: "Image content does not match file type." };
  }

  if (shouldUseBlobStorage()) {
    return saveBlobProfileImageUpload(buffer, kind, detectedExt, file.type);
  }

  return saveLocalProfileImageUpload(buffer, kind, detectedExt);
}
