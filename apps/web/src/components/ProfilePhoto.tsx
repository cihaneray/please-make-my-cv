"use client";
import NextImage from "next/image";
import { useRef, useState } from "react";
import { useCopy } from "@/lib/copy";

export function ProfilePhoto({
  value,
  visible,
  onChange,
  onVisibilityChange,
}: {
  value: string;
  visible: boolean;
  onChange: (photo: string) => void;
  onVisibilityChange: (show: boolean) => void;
}) {
  const copy = useCopy();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError(copy("Choose a PNG, JPEG or WebP image up to 5 MB."));
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (
        !image.naturalWidth ||
        !image.naturalHeight ||
        image.naturalWidth * image.naturalHeight > 40_000_000
      )
        throw new Error("Invalid dimensions");
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 320, 320);
      ctx.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        320,
        320,
      );
      onChange(canvas.toDataURL("image/jpeg", 0.9));
    } catch {
      setError(copy("This image could not be read. Try another photo."));
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <section
      className="profile-photo-editor"
      aria-labelledby="profile-photo-title"
      aria-busy={busy}
    >
      <div className="profile-photo-heading">
        <h3 id="profile-photo-title">{copy("CV photo (optional)")}</h3>
        <span>{copy("Optional")}</span>
      </div>
      <p>
        {copy(
          "Upload a portrait if you want to include one. The image is cropped to a square and stored with this CV.",
        )}
      </p>
      <div className="profile-photo-controls">
        <div className="profile-photo-thumbnail">
          {value ? (
            <NextImage
              unoptimized
              src={value}
              alt={copy("Selected CV photo")}
              width={72}
              height={72}
            />
          ) : (
            <span aria-hidden="true">{copy("Photo")}</span>
          )}
        </div>
        <div className="profile-photo-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy
              ? copy("Working…")
              : value
                ? copy("Change photo")
                : copy("Upload photo")}
          </button>
          {value && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onChange("");
                setError("");
              }}
            >
              {copy("Remove photo")}
            </button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={copy("Choose CV photo")}
          hidden
          disabled={busy}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      {value && (
        <label className="profile-photo-visibility">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => onVisibilityChange(e.target.checked)}
          />
          {copy("Show photo on CV")}
        </label>
      )}
      <p className="profile-photo-hint">
        {copy(
          "PNG, JPEG or WebP · up to 5 MB. Save the draft to keep your changes.",
        )}
      </p>
      {error && (
        <p role="alert" className="profile-photo-error">
          {error}
        </p>
      )}
    </section>
  );
}
