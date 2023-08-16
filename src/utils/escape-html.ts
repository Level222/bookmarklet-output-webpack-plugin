export const escapeHtml = (str: string): string => {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&#34;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
};
