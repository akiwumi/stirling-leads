import { normalizeWebsiteUrl } from "@/lib/leads";

type AnalysisFinding = {
  sourceType: string;
  sourceUrl: string;
  foundText: string;
};

export type WebsiteAnalysisResult = {
  summary: string | null;
  findings: AnalysisFinding[];
  primaryEmail: string | null;
  postalAddress: string | null;
  contactPageUrl: string | null;
};

const opportunityMatchers = [
  { type: "analysis_menu_page", label: "Menu page", pattern: /(menu|food|drink)/i },
  { type: "analysis_booking_page", label: "Booking page", pattern: /(book|booking|reserve|reservation)/i },
  { type: "analysis_event_page", label: "Event page", pattern: /(event|events|whats-on|whatson)/i },
  { type: "analysis_product_page", label: "Product page", pattern: /(product|shop|store|order)/i },
  { type: "analysis_listing_page", label: "Listing page", pattern: /(listing|listings|property|properties|rooms)/i },
];

// Paths to probe when the homepage contains no email
const CONTACT_PATH_PROBES = [
  "/contact",
  "/contact-us",
  "/contacts",
  "/about",
  "/about-us",
  "/enquire",
  "/get-in-touch",
  "/reach-us",
  "/info",
];

export async function analyzeCompanyWebsite(websiteUrl: string) {
  const normalizedWebsiteUrl = normalizeWebsiteUrl(websiteUrl);

  if (!normalizedWebsiteUrl) {
    return {
      summary: null,
      findings: [],
      primaryEmail: null,
      postalAddress: null,
      contactPageUrl: null,
    } satisfies WebsiteAnalysisResult;
  }

  const response = await fetchPage(normalizedWebsiteUrl);

  // Try to use response body even on non-2xx — many sites return 403 but include usable HTML
  const html = await response.text().catch(() => "");
  if (!html || (!response.ok && html.length < 500)) {
    throw new Error(`Website fetch failed with ${response.status}`);
  }

  const hrefs = extractLinks(html, normalizedWebsiteUrl);

  // Extract emails from mailto: links first — highest confidence source
  const mailtoEmails = extractMailtoEmails(html);

  // Find contact page candidates from discovered links
  const contactCandidatesFromLinks = hrefs
    .filter((link) => /contact|about|team|get-in-touch|find-us|enquir|reach|info/i.test(`${link.url} ${link.label}`))
    .map((link) => link.url)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 3);

  const pages: Array<{ url: string; html: string }> = [{ url: normalizedWebsiteUrl, html }];

  for (const pageUrl of contactCandidatesFromLinks) {
    try {
      const pageResponse = await fetchPage(pageUrl);
      const pageHtml = await pageResponse.text().catch(() => "");
      if (pageHtml.length > 200) {
        pages.push({ url: pageUrl, html: pageHtml });
      }
    } catch {
      continue;
    }
  }

  // If still no email found after checking linked contact pages, probe common paths
  const emailsSoFar = [
    ...mailtoEmails,
    ...(pages.flatMap((p) => extractMailtoEmails(p.html))),
    ...(pages.flatMap((p) => p.html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])),
  ];

  if (emailsSoFar.length === 0) {
    const origin = new URL(normalizedWebsiteUrl).origin;
    const alreadyFetched = new Set(pages.map((p) => p.url));

    for (const path of CONTACT_PATH_PROBES) {
      const probeUrl = `${origin}${path}`;
      if (alreadyFetched.has(probeUrl)) continue;
      try {
        const probeResponse = await fetchPage(probeUrl);
        const probeHtml = await probeResponse.text().catch(() => "");
        if (probeHtml.length < 200) continue;
        pages.push({ url: probeUrl, html: probeHtml });
        // Stop probing as soon as we find emails
        const found = [
          ...extractMailtoEmails(probeHtml),
          ...(probeHtml.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []),
        ];
        if (found.length > 0) break;
      } catch {
        continue;
      }
    }
  }

  const title = matchOne(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = matchOne(html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i);

  // Collect emails from all pages: mailto links (highest priority) + regex matches
  const allEmailsRaw = Array.from(
    new Set([
      // mailto: links and Cloudflare-protected emails — most reliable
      ...pages.flatMap((p) => extractMailtoEmails(p.html)),
      // regex scan of all page text — catches plain-text emails
      ...pages.flatMap((p) => p.html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []),
    ])
  )
    .map((e) => e.toLowerCase())
    .filter((e) => !e.match(/\.(png|jpg|jpeg|gif|webp|svg|css|js)$/) && !e.includes("sentry") && !e.includes("wixpress") && !e.includes("example"));

  const emails = rankEmails(allEmailsRaw).slice(0, 10);
  const postalAddress = extractPostalAddress(pages.map((page) => page.html).join("\n"));
  const contactPageUrl = contactCandidatesFromLinks[0] ?? null;

  const findings: AnalysisFinding[] = [];

  if (title) {
    findings.push({ sourceType: "analysis_title", sourceUrl: normalizedWebsiteUrl, foundText: title });
  }

  if (description) {
    findings.push({ sourceType: "analysis_meta_description", sourceUrl: normalizedWebsiteUrl, foundText: description });
  }

  for (const href of hrefs.filter((link) => /contact/i.test(link.url)).slice(0, 5)) {
    findings.push({ sourceType: "analysis_contact_page", sourceUrl: href.url, foundText: href.label || "Contact page" });
  }

  for (const href of hrefs.filter((link) => /\.pdf($|\?)/i.test(link.url)).slice(0, 5)) {
    findings.push({ sourceType: "analysis_pdf_link", sourceUrl: href.url, foundText: href.label || "PDF link" });
  }

  for (const matcher of opportunityMatchers) {
    for (const href of hrefs.filter((link) => matcher.pattern.test(`${link.url} ${link.label}`)).slice(0, 3)) {
      findings.push({ sourceType: matcher.type, sourceUrl: href.url, foundText: href.label || matcher.label });
    }
  }

  for (const email of emails) {
    findings.push({
      sourceType: "analysis_public_email",
      sourceUrl: contactPageUrl || normalizedWebsiteUrl,
      foundText: email,
    });
  }

  if (postalAddress) {
    findings.push({
      sourceType: "analysis_postal_address",
      sourceUrl: contactPageUrl || normalizedWebsiteUrl,
      foundText: postalAddress,
    });
  }

  const summaryParts = [title, description, emails[0], postalAddress].filter(Boolean);

  return {
    summary: summaryParts.length > 0 ? summaryParts.join(" · ") : null,
    findings: dedupeFindings(findings),
    primaryEmail: emails[0] ?? null,
    postalAddress,
    contactPageUrl,
  } satisfies WebsiteAnalysisResult;
}

async function fetchPage(url: string) {
  return fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "accept": "text/html,application/xhtml+xml",
      "accept-language": "en-GB,en;q=0.9",
    },
  });
}

/**
 * Decode a Cloudflare-protected email. Cloudflare encodes emails as hex where
 * the first byte is the XOR key and subsequent byte pairs are XOR'd with it.
 */
function decodeCfEmail(encoded: string): string | null {
  try {
    const key = parseInt(encoded.slice(0, 2), 16);
    let result = "";
    for (let i = 2; i < encoded.length; i += 2) {
      result += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
    }
    return result.includes("@") ? result.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Extract email addresses from:
 * 1. href="mailto:..." attributes — highest confidence
 * 2. Cloudflare email protection links — href="/cdn-cgi/l/email-protection#HEX"
 * 3. Cloudflare data-cfemail attributes — data-cfemail="HEX"
 */
function extractMailtoEmails(html: string): string[] {
  const emails: string[] = [];

  // Standard mailto: links
  const mailtoMatches = html.matchAll(/href=["']mailto:([^"'?>\s]+)/gi);
  for (const match of mailtoMatches) {
    const email = match[1]?.toLowerCase().trim();
    if (email && email.includes("@")) {
      emails.push(email);
    }
  }

  // Cloudflare email protection via href
  const cfHrefMatches = html.matchAll(/href=["']\/cdn-cgi\/l\/email-protection#([A-Fa-f0-9]+)["']/g);
  for (const match of cfHrefMatches) {
    const decoded = decodeCfEmail(match[1]);
    if (decoded) emails.push(decoded);
  }

  // Cloudflare email protection via data-cfemail attribute
  const cfDataMatches = html.matchAll(/data-cfemail=["']([A-Fa-f0-9]+)["']/g);
  for (const match of cfDataMatches) {
    const decoded = decodeCfEmail(match[1]);
    if (decoded) emails.push(decoded);
  }

  return [...new Set(emails)];
}

/**
 * Rank emails so business-contact addresses come first.
 * Generic prefixes (info, contact, hello, enquiries) are preferred over
 * personal names, and noreply/system addresses are deprioritised.
 */
function rankEmails(emails: string[]): string[] {
  const PREFERRED = /^(info|contact|hello|enquir|mail|sales|office|admin|reception|team|hq|hi|hey|support)@/i;
  const DEPRIORITISED = /^(noreply|no-reply|donotreply|bounce|notification|alert|newsletter|automated)/i;

  return [...emails].sort((a, b) => {
    const aGood = PREFERRED.test(a) ? 0 : 1;
    const bGood = PREFERRED.test(b) ? 0 : 1;
    const aBad = DEPRIORITISED.test(a) ? 1 : 0;
    const bBad = DEPRIORITISED.test(b) ? 1 : 0;
    return aGood - bGood || aBad - bBad;
  });
}

function extractLinks(html: string, baseUrl: string) {
  const matches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  const links: Array<{ url: string; label: string }> = [];

  for (const match of matches) {
    const rawHref = match[1]?.trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
      continue;
    }
    try {
      const url = new URL(rawHref, baseUrl).toString();
      const label = stripHtml(match[2] ?? "");
      links.push({ url, label });
    } catch {
      continue;
    }
  }

  return links;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function matchOne(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function extractPostalAddress(html: string) {
  const addressBlock = matchOne(html, /<address[^>]*>([\s\S]*?)<\/address>/i);
  const normalizedAddressBlock = addressBlock ? stripHtml(addressBlock).replace(/\s{2,}/g, " ").trim() : null;

  if (normalizedAddressBlock && looksLikePostalAddress(normalizedAddressBlock)) {
    return normalizedAddressBlock;
  }

  const jsonLdAddress = extractJsonLdAddress(html);
  if (jsonLdAddress) {
    return jsonLdAddress;
  }

  const text = stripHtml(html).replace(/\s+/g, " ");
  const regexes = [
    /\b\d{1,5}\s+[A-Za-z0-9'.,\- ]{4,80}\b(?:Street|St|Road|Rd|Lane|Ln|Drive|Dr|Avenue|Ave|Way|Close|Court|Ct|Place|Pl|Boulevard|Blvd|High Street|High Rd|Square|Quay)\b[\s,.-]*[A-Za-z0-9'.,\- ]{0,80}/i,
    /\b[A-Za-z0-9'.,\- ]{4,80},\s*[A-Za-z0-9'.,\- ]{2,60},\s*(?:[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}|[A-Z]{2,3}\s*\d{2,5})\b/i,
  ];

  for (const regex of regexes) {
    const match = text.match(regex)?.[0]?.trim();
    if (match && looksLikePostalAddress(match)) {
      return match;
    }
  }

  return null;
}

function extractJsonLdAddress(html: string) {
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const candidate = findAddressInJson(parsed);
      if (candidate) return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

function findAddressInJson(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findAddressInJson(item);
      if (result) return result;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const address = record.address;

  if (address && typeof address === "object" && !Array.isArray(address)) {
    const a = address as Record<string, unknown>;
    const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
    if (parts.length > 0) return parts.join(", ");
  }

  for (const nested of Object.values(record)) {
    const result = findAddressInJson(nested);
    if (result) return result;
  }

  return null;
}

function looksLikePostalAddress(value: string) {
  return /\d/.test(value) && /(street|st\b|road|rd\b|lane|ln\b|drive|dr\b|avenue|ave\b|close|court|boulevard|blvd|postcode|postal|suite|floor|building|square|quay|park)/i.test(value);
}

function dedupeFindings(findings: AnalysisFinding[]) {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.sourceType}:${f.sourceUrl}:${f.foundText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
