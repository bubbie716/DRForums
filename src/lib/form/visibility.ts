import type { PublicFormView } from "@/lib/form/types";

/**
 * V1: all open forms are public on /forms.
 * Future: filter by role/category permissions before listing or rendering.
 */
export function isFormPubliclyVisible(_form: PublicFormView): boolean {
  return true;
}
