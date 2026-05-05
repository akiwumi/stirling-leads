import { normalizeWebsiteUrl } from "@/lib/leads";

export type WebsitePage = {
  url: string;
  html: string;
  text: string;
  title: string | null;
  status: number;
  fetchMode: "direct" | "scraper";
};

export type WebsiteLink = {
  url: string;
  label: string;
};

export type WebsiteCrawlResult = {
  baseUrl: string | null;
  pages: WebsitePage[];
  pagesChecked: string[];
  contactPageUrl: string | null;
  linkedinUrls: string[];
  warnings: string[];
};

type CrawlOptions = {
  maxPages?: number;
  focus?: "company" | "people";
};

const COMPANY_PATH_HINTS = [
  "/contact",
  "/contact-us",
  "/contacts",
  "/about",
  "/about-us",
  "/company",
  "/locations",
  "/find-us",
  "/visit-us",
  "/reach-us",
  "/info",
];

const PEOPLE_PATH_HINTS = [
  "/team",
  "/our-team",
  "/leadership",
  "/people",
  "/staff",
  "/about/team",
  "/about-us/team",
  "/management",
  "/company/team",
];

const LINK_KEYWORDS = /(team|people|leadership|staff|founder|management|about|contact|company|our-story|meet)/i;

export async function crawlCompanyWebsite(websiteUrl: string, options: CrawlOptions = {}): Promise<WebsiteCrawlResult> {
  const baseUrl = normalizeWebsiteUrl(websiteUrl);

  if (!baseUrl) {
    return {
      baseUrl: null,
      pages: [],
      pagesChecked: [],
      contactPageUrl: null,
      linkedinUrls: [],
      warnings: ["Invalid company website URL."],
    };
  }

  const maxPages = Math.max(3, Math.min(options.maxPages ?? 8, 12));
  const warnings: string[] = [];
  const pages: WebsitePage[] = [];
  const seen = new Set<string>();

  const homePage = await fetchWebsitePage(baseUrl);
  if (homePage) {
    pages.push(homePage);
    seen.add(homePage.url);
  } else {
    warnings.push("Homepage fetch failed.");
  }

  const homeHtml = homePage?.html ?? "";
  const homeLinks = homeHtml ? extractLinks(homeHtml, baseUrl) : [];
  const sitemapUrls = await fetchSitemapHints(baseUrl);

  const candidates = rankCandidateUrls(baseUrl, homeLinks, sitemapUrls, options.focus ?? "company").filter((url) => !seen.has(url));

  for (const candidate of candidates) {
    if (pages.length >= maxPages) break;
    const page = await fetchWebsitePage(candidate);
    if (!page) continue;
    if (page.text.length < 120) continue;
    if (seen.has(page.url)) continue;
    pages.push(page);
    seen.add(page.url);
  }

  const linkedinUrls = Array.from(
    new Set(
      pages.flatMap((page) => {
        const pageLinks = extractLinks(page.html, page.url);
        return pageLinks
          .map((link) => normalizeLinkedInUrl(link.url))
          .filter((value): value is string => Boolean(value));
      }),
    ),
  );

  const contactPageUrl =
    pages.find((page) => /contact|find-us|visit-us|get-in-touch|reach-us/i.test(page.url) || /contact/i.test(page.title ?? ""))?.url ?? null;

  if (pages.length === 0) {
    warnings.push("No usable website pages were fetched.");
  }

  return {
    baseUrl,
    pages,
    pagesChecked: pages.map((page) => page.url),
    contactPageUrl,
    linkedinUrls,
    warnings,
  };
}

async function fetchWebsitePage(url: string): Promise<WebsitePage | null> {
  const direct = await tryFetchPage(url, "direct");
  if (isUsablePage(direct)) return direct;

  if (process.env.SCRAPER_API_KEY) {
    const rendered = await tryFetchPage(url, "scraper");
    if (isUsablePage(rendered)) return rendered;
    if (rendered) return rendered;
  }

  return direct;
}

async function tryFetchPage(url: string, mode: "direct" | "scraper"): Promise<WebsitePage | null> {
  try {
    const response =
      mode === "direct"
        ? await fetch(url, {
            cache: "no-store",
            signal: AbortSignal.timeout(12_000),
            headers: {
              "user-agent": "Mozilla/5.0 (compatible; StirlingBot/2.0; +https://stirlingqr.com)",
              accept: "text/html,application/xhtml+xml",
              "accept-language": "en-US,en;q=0.9",
            },
          })
        : await fetch(buildScrapingBeeUrl(url), {
            cache: "no-store",
            signal: AbortSignal.timeout(45_000),
          });

    const html = await response.text().catch(() => "");
    const text = htmlToText(html);
    return {
      url,
      html,
      text,
      title: matchOne(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      status: response.status,
      fetchMode: mode,
    };
  } catch {
    return null;
  }
}

function buildScrapingBeeUrl(url: string) {
  const params = new URLSearchParams({
    api_key: process.env.SCRAPER_API_KEY ?? "",
    url,
    render_js: "true",
    block_resources: "false",
    wait: "1500",
    timeout: "30000",
    transparent_status_code: "true",
  });
  return `https://app.scrapingbee.com/api/v1?${params.toString()}`;
}

function isUsablePage(page: WebsitePage | null) {
  if (!page) return false;
  if (!page.html) return false;
  if (page.status >= 500) return false;
  if (page.text.length < 120) return false;
  if (/access denied|forbidden|captcha|cloudflare/i.test(page.text) && page.text.length < 600) return false;
  return true;
}

async function fetchSitemapHints(baseUrl: string) {
  const candidates = [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap_index.xml`];
  for (const sitemapUrl of candidates) {
    try {
      const response = await fetch(sitemapUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; StirlingBot/2.0)" },
      });
      if (!response.ok) continue;
      const xml = await response.text().catch(() => "");
      const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/gi))
        .map((match) => match[1]?.trim())
        .filter((value): value is string => Boolean(value))
        .filter((value) => LINK_KEYWORDS.test(value))
        .slice(0, 30);
      if (urls.length > 0) return urls;
    } catch {
      continue;
    }
  }
  return [] as string[];
}

function rankCandidateUrls(baseUrl: string, homeLinks: WebsiteLink[], sitemapUrls: string[], focus: "company" | "people") {
  const hints = focus === "people" ? [...PEOPLE_PATH_HINTS, ...COMPANY_PATH_HINTS] : [...COMPANY_PATH_HINTS, ...PEOPLE_PATH_HINTS];
  const fromPaths = hints.map((path) => `${baseUrl}${path}`);
  const fromLinks = homeLinks
    .filter((link) => LINK_KEYWORDS.test(`${link.url} ${link.label}`))
    .map((link) => link.url);

  return Array.from(new Set([...fromLinks, ...sitemapUrls, ...fromPaths]))
    .filter((url) => isSameOrigin(baseUrl, url))
    .sort((a, b) => scoreCandidate(b, focus) - scoreCandidate(a, focus))
    .slice(0, 20);
}

function scoreCandidate(url: string, focus: "company" | "people") {
  const value = url.toLowerCase();
  let score = 0;
  if (/team|leadership|people|staff|management/.test(value)) score += focus === "people" ? 10 : 5;
  if (/contact|about|company|location|visit-us|find-us/.test(value)) score += focus === "company" ? 10 : 4;
  if (/founder|ceo|executive/.test(value)) score += 6;
  if (/\/blog|\/news|\/careers|\/jobs|\/privacy|\/terms/.test(value)) score -= 8;
  return score;
}

function isSameOrigin(baseUrl: string, candidate: string) {
  try {
    const base = new URL(baseUrl);
    const url = new URL(candidate, baseUrl);
    return url.hostname === base.hostname;
  } catch {
    return false;
  }
}

export function extractLinks(html: string, baseUrl: string): WebsiteLink[] {
  const matches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  const links: WebsiteLink[] = [];

  for (const match of matches) {
    const rawHref = match[1]?.trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) continue;
    try {
      const url = new URL(rawHref, baseUrl).toString();
      links.push({ url, label: stripHtml(match[2] ?? "") });
    } catch {
      continue;
    }
  }

  return links;
}

export function htmlToText(html: string) {
  return stripHtml(
    html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " "),
  );
}

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLinkedInUrl(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  try {
    const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (!hostname.endsWith("linkedin.com")) return null;
    return `https://www.linkedin.com${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export function matchOne(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}
