export function formatFieldLabel(
  key: string,
  copy: (text: string) => string,
): string {
  const numbered = key.match(/^(.*) (\d+)$/);
  const name = numbered ? numbered[1] : key;
  const label = name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase());
  return `${copy(label)}${numbered ? ` ${numbered[2]}` : ""}`;
}
