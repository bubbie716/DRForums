"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampProfileCropState,
  cropProfileImage,
  getDefaultProfileCropState,
  getImageTransform,
  getMinZoom,
  getProfileCropArea,
  loadImageElement,
  loadImageFromFile,
  type ProfileCropKind,
  type ProfileCropState,
} from "@/lib/profile/crop";

type ProfileImageCropModalProps = {
  open: boolean;
  imageFile?: File | null;
  imageSrc?: string | null;
  kind: ProfileCropKind;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
};

export function ProfileImageCropModal({
  open,
  imageFile = null,
  imageSrc = null,
  kind,
  loading = false,
  onConfirm,
  onClose,
}: ProfileImageCropModalProps) {
  const cropArea = getProfileCropArea(kind);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cropState, setCropState] = useState<ProfileCropState>(
    getDefaultProfileCropState()
  );
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, cropX: 0, cropY: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || (!imageFile && !imageSrc)) {
      setImage(null);
      setCropState(getDefaultProfileCropState());
      setError("");
      return;
    }

    let cancelled = false;

    const loader = imageFile
      ? loadImageFromFile(imageFile)
      : loadImageElement(imageSrc!);

    loader
      .then((loaded) => {
        if (!cancelled) {
          setImage(loaded);
          setCropState(getDefaultProfileCropState());
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load image for editing.");
          setImage(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, imageFile, imageSrc]);

  const clampState = useCallback(
    (state: ProfileCropState) => {
      if (!image) {
        return state;
      }

      return clampProfileCropState(
        image.naturalWidth,
        image.naturalHeight,
        cropArea,
        state
      );
    },
    [cropArea, image]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!image) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      dragOrigin.current = {
        x: event.clientX,
        y: event.clientY,
        cropX: cropState.x,
        cropY: cropState.y,
      };
    },
    [cropState.x, cropState.y, image]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) {
        return;
      }

      const deltaX = event.clientX - dragOrigin.current.x;
      const deltaY = event.clientY - dragOrigin.current.y;

      setCropState((current) =>
        clampState({
          ...current,
          x: dragOrigin.current.cropX + deltaX,
          y: dragOrigin.current.cropY + deltaY,
        })
      );
    },
    [dragging, clampState]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragging(false);
    },
    [dragging]
  );

  async function handleApply() {
    if (!image) {
      return;
    }

    try {
      const file = await cropProfileImage(image, kind, cropArea, cropState);
      onConfirm(file);
    } catch {
      setError("Unable to save cropped image.");
    }
  }

  function handleReset() {
    setCropState(getDefaultProfileCropState());
  }

  const defaultCropState = getDefaultProfileCropState();
  const isDefaultCrop =
    cropState.x === defaultCropState.x &&
    cropState.y === defaultCropState.y &&
    cropState.zoom === defaultCropState.zoom;

  if (!open) {
    return null;
  }

  const title = kind === "avatar" ? "Adjust profile picture" : "Adjust banner";
  const subtitle =
    kind === "avatar"
      ? "Drag to reposition and use the slider to zoom."
      : "Drag to reposition and zoom your banner into the frame.";

  const transform = image
    ? getImageTransform(
        image.naturalWidth,
        image.naturalHeight,
        cropArea,
        cropState
      )
    : null;

  const minZoom = image
    ? getMinZoom(image.naturalWidth, image.naturalHeight, cropArea)
    : 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-text-dark/40 backdrop-blur-sm"
        onClick={onClose}
        disabled={loading}
        aria-label="Close crop editor"
      />

      <div
        className="relative w-full max-w-xl bg-white border border-border rounded-2xl shadow-warm-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-crop-title"
      >
        <div className="px-6 py-5 border-b border-border bg-surface">
          <h2
            id="profile-crop-title"
            className="text-lg font-extrabold text-text-dark"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error ? (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          ) : null}

          <div className="mx-auto w-full max-w-full overflow-hidden rounded-xl border border-border bg-text-dark/90">
            <div
              className="relative mx-auto touch-none cursor-grab active:cursor-grabbing"
              style={{ width: cropArea.width, height: cropArea.height }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {image && transform ? (
                <img
                  src={image.src}
                  alt=""
                  draggable={false}
                  className="absolute max-w-none select-none pointer-events-none"
                  style={{
                    width: transform.displayWidth,
                    height: transform.displayHeight,
                    transform: `translate(${transform.x}px, ${transform.y}px)`,
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                  Loading image…
                </div>
              )}

              {kind === "avatar" ? (
                <div className="pointer-events-none absolute inset-0 ring-2 ring-white/70 ring-inset" />
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="profile-crop-zoom"
                className="text-sm font-bold text-text-dark"
              >
                Zoom
              </label>
              <button
                type="button"
                onClick={handleReset}
                disabled={!image || loading || isDefaultCrop}
                className="text-sm font-semibold text-accent hover:text-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reset
              </button>
            </div>
            <input
              id="profile-crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={cropState.zoom}
              disabled={!image || loading}
              onChange={(event) =>
                setCropState((current) =>
                  clampState({
                    ...current,
                    zoom: Number.parseFloat(event.target.value),
                  })
                )
              }
              className="mt-2 w-full accent-accent"
            />
            <p className="mt-1 text-xs text-text-secondary">
              Output:{" "}
              {kind === "avatar"
                ? "256×256 square"
                : "960×240 banner"}
              {image ? ` · min zoom ${minZoom.toFixed(2)}` : null}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-11 px-5 py-2.5 text-sm font-semibold rounded-xl border border-border text-text-dark hover:bg-hover transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!image || loading}
            className="min-h-11 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-orange text-white hover:shadow-warm transition-all disabled:opacity-60"
          >
            {loading ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
