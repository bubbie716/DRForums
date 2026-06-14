export const PROFILE_AVATAR_OUTPUT_SIZE = 256;
export const PROFILE_BANNER_OUTPUT_WIDTH = 960;
export const PROFILE_BANNER_OUTPUT_HEIGHT = 240;

export const PROFILE_BANNER_ASPECT =
  PROFILE_BANNER_OUTPUT_WIDTH / PROFILE_BANNER_OUTPUT_HEIGHT;

export type ProfileCropKind = "avatar" | "banner";

export type ProfileCropState = {
  x: number;
  y: number;
  zoom: number;
};

export type ProfileCropArea = {
  width: number;
  height: number;
};

export function getProfileCropArea(kind: ProfileCropKind): ProfileCropArea {
  if (kind === "avatar") {
    return { width: 280, height: 280 };
  }

  return { width: 560, height: 140 };
}

export function getDefaultProfileCropState(): ProfileCropState {
  return { x: 0, y: 0, zoom: 1 };
}

export function getMinZoom(
  imageWidth: number,
  imageHeight: number,
  crop: ProfileCropArea
): number {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return 1;
  }

  return Math.max(crop.width / imageWidth, crop.height / imageHeight);
}

export function getImageTransform(
  imageWidth: number,
  imageHeight: number,
  crop: ProfileCropArea,
  state: ProfileCropState
) {
  const minZoom = getMinZoom(imageWidth, imageHeight, crop);
  const scale = minZoom * state.zoom;
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;
  const x = (crop.width - displayWidth) / 2 + state.x;
  const y = (crop.height - displayHeight) / 2 + state.y;

  return { scale, displayWidth, displayHeight, x, y, minZoom };
}

export function clampProfileCropState(
  imageWidth: number,
  imageHeight: number,
  crop: ProfileCropArea,
  state: ProfileCropState
): ProfileCropState {
  const { displayWidth, displayHeight } = getImageTransform(
    imageWidth,
    imageHeight,
    crop,
    state
  );

  const minX = (crop.width - displayWidth) / 2;
  const maxX = (displayWidth - crop.width) / 2;
  const minY = (crop.height - displayHeight) / 2;
  const maxY = (displayHeight - crop.height) / 2;

  return {
    zoom: state.zoom,
    x: Math.min(maxX, Math.max(minX, state.x)),
    y: Math.min(maxY, Math.max(minY, state.y)),
  };
}

export async function cropProfileImage(
  image: HTMLImageElement,
  kind: ProfileCropKind,
  cropArea: ProfileCropArea,
  state: ProfileCropState
): Promise<File> {
  const { scale, x, y } = getImageTransform(
    image.naturalWidth,
    image.naturalHeight,
    cropArea,
    state
  );

  const sourceX = -x / scale;
  const sourceY = -y / scale;
  const sourceWidth = cropArea.width / scale;
  const sourceHeight = cropArea.height / scale;

  const outputWidth =
    kind === "avatar"
      ? PROFILE_AVATAR_OUTPUT_SIZE
      : PROFILE_BANNER_OUTPUT_WIDTH;
  const outputHeight =
    kind === "avatar"
      ? PROFILE_AVATAR_OUTPUT_SIZE
      : PROFILE_BANNER_OUTPUT_HEIGHT;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to crop image.");
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const mimeType = "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Unable to export cropped image."));
          return;
        }
        resolve(result);
      },
      mimeType,
      0.92
    );
  });

  const filename =
    kind === "avatar" ? "avatar-cropped.jpg" : "banner-cropped.jpg";

  return new File([blob], filename, { type: mimeType });
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read image file."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });

  return loadImageElement(dataUrl);
}

export async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const isBlobUrl = src.startsWith("blob:");
    const isDataUrl = src.startsWith("data:");
    const isSameOrigin =
      src.startsWith("/") ||
      (typeof window !== "undefined" && src.startsWith(window.location.origin));

    if (!isBlobUrl && !isDataUrl && !isSameOrigin) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image."));
    image.src = src;
  });
}
