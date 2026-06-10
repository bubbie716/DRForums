"use client";

import { useEffect, useRef } from "react";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { slugify } from "@/lib/slug";

type SlugFieldProps = {
  name: string;
  slug: string;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  nameLabel: string;
  slugLabel?: string;
  slugPrefix?: string;
};

export function SlugField({
  name,
  slug,
  onNameChange,
  onSlugChange,
  nameLabel,
  slugLabel = "URL name",
  slugPrefix,
}: SlugFieldProps) {
  const slugManuallyEdited = useRef(false);

  useEffect(() => {
    if (slugManuallyEdited.current) {
      return;
    }

    const generated = slugPrefix
      ? `${slugify(slugPrefix)}-${slugify(name)}`.replace(/(^-|-$)/g, "")
      : slugify(name);

    if (generated !== slug) {
      onSlugChange(generated);
    }
  }, [name, slug, slugPrefix, onSlugChange]);

  return (
    <>
      <div className="space-y-2">
        <FieldLabel>{nameLabel}</FieldLabel>
        <input
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          required
          maxLength={100}
          className={formInputClassName}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>{slugLabel}</FieldLabel>
        <input
          type="text"
          value={slug}
          onChange={(event) => {
            slugManuallyEdited.current = true;
            onSlugChange(event.target.value.toLowerCase());
          }}
          required
          maxLength={120}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          className={formInputClassName}
        />
        <p className="text-xs text-text-secondary">
          Used in the web address. Fills in automatically from the name.
        </p>
      </div>
    </>
  );
}
