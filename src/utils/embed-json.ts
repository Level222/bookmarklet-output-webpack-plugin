export const embedJson = (data: unknown): string => {
  return JSON.stringify(data)
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
};
