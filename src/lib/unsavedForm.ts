export function serializeNativeForm(form: HTMLFormElement): string {
  const data = new FormData(form);
  const pairs: string[] = [];

  for (const [key, value] of data.entries()) {
    if (value instanceof File) {
      continue;
    }
    pairs.push(`${key}=${String(value)}`);
  }

  pairs.sort();
  return pairs.join("&");
}
