import { normalizeWebsiteUrl } from "@/lib/leads";

type AnalysisFinding = {
  sourceType: string;
  sourceUrl: string;
  foundText: string;
};

export type WebsiteAnalysisResult = {
  summary: string | null;
  findings: AnalysisFinding[];
};

const opportunityMatchers = [
  { type: "analysis_menu_page", label: "Menu page", pattern: /(menu|food|drink)/i },
  { type: "analysis_booking_page", label: "Booking page", pattern: /(book|booking|reserve|reservation)/i },
  { type: "analysis_event_page", label: "Event page", pattern: /(event|events|whats-on|whatson)/i },
  { type: "analysis_product_page", label: "Product page", pattern: /(product|shop|store|order)/i },
  { type: "analysis_listing_page", label: "Listing page", pattern: /(listing|listings|property|properties|rooms)/i },
];

export async function analyzeCompanyWebsite(websiteUrl: string) {
  const normalizedWebsiteUrl = normalizeWebsiteUrl(websiteUrl);

  if (!normalizedWebsiteUrl) {
    return {
      summary: null,
      findings: [],
    } satisfies WebsiteAnalysisResult;
  }

  const response = await fetch(normalizedWebsiteUrl, {
    cache: "no-store",
    headers: {
      "user-agent": "StirlingLeadFinder/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Website fetch failed with ${response.status}`);
  }

  const html = await response.text();
  const title = matchOne(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = matchOne(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
  );
  const emails = Array.from(new Set(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])).slice(0, 10);
  const hrefs = extractLinks(html, normalizedWebsiteUrl);

  const findings: AnalysisFinding[] = [];

  if (title) {
    findings.push({
      sourceType: "analysis_title",
      sourceUrl: normalizedWebsiteUrl,
      foundText: title,
    });
  }

  if (description) {
    findings.push({
      sourceType: "analysis_meta_description",
      sourceUrl: normalizedWebsiteUrl,
      foundText: description,
    });
  }

  for (const href of hrefs.filter((link) => /contact/i.test(link.url)).slice(0, 5)) {
    findings.push({
      sourceType: "analysis_contact_page",
      sourceUrl: href.url,
      foundText: href.label || "Contact page",
    });
  }

  for (const href of hrefs.filter((link) => /\.pdf($|\?)/i.test(link.url)).slice(0, 5)) {
    findings.push({
      sourceType: "analysis_pdf_link",
      sourceUrl: href.url,
      foundText: href.label || "PDF link",
    });
  }

  for (const matcher of opportunityMatchers) {
    for (const href of hrefs.filter((link) => matcher.pattern.test(`${link.url} ${link.label}`)).slice(0, 3)) {
      findings.push({
        sourceType: matcher.type,
        sourceUrl: href.url,
        foundText: href.label || matcher.label,
      });
    }
  }

  for (const email of emails) {
    findings.push({
      sourceType: "analysis_public_email",
      sourceUrl: normalizedWebsiteUrl,
      foundText: email,
    });
  }

  const summaryParts = [title, description, emails[0]].filter(Boolean);

  return {
    summary: summaryParts.length > 0 ? summaryParts.join(" · ") : null,
    findings: dedupeFindings(findings),
  } satisfies WebsiteAnalysisResult;
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

function dedupeFindings(findings: AnalysisFinding[]) {
  const seen = new Set<string>();

  return findings.filter((finding) => {
    const key = `${finding.sourceType}:${finding.sourceUrl}:${finding.foundText}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
