import { extractWebsiteEnrichmentWithAI } from "@/lib/company-enrichment";
import { enrichCompanyPeople } from "@/lib/people-enrichment";
import { crawlCompanyWebsite, extractLinks, htmlToText, matchOne, stripHtml } from "@/lib/website-intelligence";

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

export async function analyzeCompanyWebsite(websiteUrl: string) {
  const crawl = await crawlCompanyWebsite(websiteUrl, { maxPages: 8, focus: "company" });

  if (!crawl.baseUrl || crawl.pages.length === 0) {
    throw new Error("Website fetch failed");
  }

  const aiEnrichment = await extractWebsiteEnrichmentWithAI({
    websiteUrl: crawl.baseUrl,
    pages: crawl.pages,
  });
  const providerEnrichment = await enrichCompanyPeople({
    websiteUrl: crawl.baseUrl,
  });

  const homepage = crawl.pages[0];
  const title = homepage ? matchOne(homepage.html, /<title[^>]*>([\s\S]*?)<\/title>/i) : null;
  const description = homepage ? matchOne(homepage.html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i) : null;
  const hrefs = homepage ? extractLinks(homepage.html, homepage.url) : [];
  const emails = rankEmails(
    Array.from(
      new Set(
        crawl.pages.flatMap((page) => [
          ...extractMailtoEmails(page.html),
          ...(page.html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((email) => email.toLowerCase()),
        ]),
      ),
    ),
  );

  const postalAddress =
    aiEnrichment.postalAddress ??
    providerEnrichment.postalAddress ??
    extractPostalAddress(crawl.pages.map((page) => page.html).join("\n"));

  const findings: AnalysisFinding[] = [];
  if (title) {
    findings.push({ sourceType: "analysis_title", sourceUrl: crawl.baseUrl, foundText: title });
  }
  if (description) {
    findings.push({ sourceType: "analysis_meta_description", sourceUrl: crawl.baseUrl, foundText: description });
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

  for (const email of emails.slice(0, 10)) {
    findings.push({
      sourceType: "analysis_public_email",
      sourceUrl: crawl.contactPageUrl || crawl.baseUrl,
      foundText: email,
    });
  }

  if (postalAddress) {
    findings.push({
      sourceType: "analysis_postal_address",
      sourceUrl: aiEnrichment.postalAddressSourceUrl || crawl.contactPageUrl || crawl.baseUrl,
      foundText: postalAddress,
    });
  }

  if (providerEnrichment.companyLinkedinUrl || aiEnrichment.companyLinkedinUrl) {
    findings.push({
      sourceType: "analysis_company_linkedin",
      sourceUrl: providerEnrichment.companyLinkedinUrl || aiEnrichment.companyLinkedinUrl || crawl.baseUrl,
      foundText: providerEnrichment.companyLinkedinUrl || aiEnrichment.companyLinkedinUrl || "",
    });
  }

  const summaryParts = [title, description, emails[0], postalAddress].filter(Boolean);

  return {
    summary: summaryParts.length > 0 ? summaryParts.join(" · ") : null,
    findings: dedupeFindings(findings),
    primaryEmail: emails[0] ?? null,
    postalAddress,
    contactPageUrl: crawl.contactPageUrl,
  } satisfies WebsiteAnalysisResult;
}

function extractMailtoEmails(html: string): string[] {
  const emails: string[] = [];

  for (const match of html.matchAll(/href=["']mailto:([^"'?>\s]+)/gi)) {
    const email = match[1]?.toLowerCase().trim();
    if (email && email.includes("@")) emails.push(email);
  }

  for (const match of html.matchAll(/href=["']\/cdn-cgi\/l\/email-protection#([A-Fa-f0-9]+)["']/g)) {
    const decoded = decodeCfEmail(match[1]);
    if (decoded) emails.push(decoded);
  }

  for (const match of html.matchAll(/data-cfemail=["']([A-Fa-f0-9]+)["']/g)) {
    const decoded = decodeCfEmail(match[1]);
    if (decoded) emails.push(decoded);
  }

  return [...new Set(emails)];
}

function decodeCfEmail(encoded: string): string | null {
  try {
    const key = parseInt(encoded.slice(0, 2), 16);
    let result = "";
    for (let index = 2; index < encoded.length; index += 2) {
      result += String.fromCharCode(parseInt(encoded.slice(index, index + 2), 16) ^ key);
    }
    return result.includes("@") ? result.toLowerCase() : null;
  } catch {
    return null;
  }
}

function rankEmails(emails: string[]) {
  const preferred = /^(info|contact|hello|enquir|mail|sales|office|admin|reception|team|hq|hi|hey|support)@/i;
  const deprioritised = /^(noreply|no-reply|donotreply|bounce|notification|alert|newsletter|automated)/i;

  return [...emails]
    .filter((email) => !email.match(/\.(png|jpg|jpeg|gif|webp|svg|css|js)$/) && !email.includes("sentry") && !email.includes("wixpress") && !email.includes("example"))
    .sort((a, b) => {
      const aGood = preferred.test(a) ? 0 : 1;
      const bGood = preferred.test(b) ? 0 : 1;
      const aBad = deprioritised.test(a) ? 1 : 0;
      const bBad = deprioritised.test(b) ? 1 : 0;
      return aGood - bGood || aBad - bBad;
    });
}

function extractPostalAddress(html: string) {
  const addressBlock = matchOne(html, /<address[^>]*>([\s\S]*?)<\/address>/i);
  const normalizedBlock = addressBlock ? stripHtml(addressBlock).replace(/\s{2,}/g, " ").trim() : null;

  if (normalizedBlock && looksLikePostalAddress(normalizedBlock)) {
    return normalizedBlock;
  }

  const jsonLdAddress = extractJsonLdAddress(html);
  if (jsonLdAddress) {
    return jsonLdAddress;
  }

  const text = htmlToText(html).replace(/\s+/g, " ");
  const regexes = [
    /\b\d{1,5}\s+[A-Za-z0-9'.,\- ]{4,80}\b(?:Street|St|Road|Rd|Lane|Ln|Drive|Dr|Avenue|Ave|Way|Close|Court|Ct|Place|Pl|Boulevard|Blvd|Square|Quay)\b[\s,.-]*[A-Za-z0-9'.,\- ]{0,80}/i,
    /\b[A-Za-z0-9'.,\- ]{4,80},\s*[A-Za-z0-9'.,\- ]{2,60},\s*(?:[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}|[A-Z]{2,3}\s*\d{2,5})\b/i,
  ];

  for (const regex of regexes) {
    const match = text.match(regex)?.[0]?.trim();
    if (match && looksLikePostalAddress(match)) return match;
  }

  return null;
}

function extractJsonLdAddress(html: string) {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
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
    const candidate = address as Record<string, unknown>;
    const parts = [candidate.streetAddress, candidate.addressLocality, candidate.addressRegion, candidate.postalCode, candidate.addressCountry]
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => entry.trim());
    if (parts.length > 0) return parts.join(", ");
  }

  for (const nested of Object.values(record)) {
    const result = findAddressInJson(nested);
    if (result) return result;
  }
  return null;
}

function looksLikePostalAddress(value: string) {
  return /\d/.test(value) && /(street|st\b|road|rd\b|lane|ln\b|drive|dr\b|avenue|ave\b|close|court|boulevard|blvd|postal|suite|floor|building|square|quay|park)/i.test(value);
}

function dedupeFindings(findings: AnalysisFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.sourceType}:${finding.sourceUrl}:${finding.foundText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
