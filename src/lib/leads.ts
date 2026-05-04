export function normalizeWebsiteUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.hostname}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function extractCompanyName(title: string, hostname: string) {
  const cleanedTitle = title
    .split(/[|\-–—]/)[0]
    ?.trim()
    ?.replace(/\s+/g, " ");

  if (cleanedTitle) {
    return cleanedTitle;
  }

  const domainPart = hostname.replace(/^www\./, "").split(".")[0] ?? "Unknown company";
  return domainPart.charAt(0).toUpperCase() + domainPart.slice(1);
}
