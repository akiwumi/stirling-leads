import { extractWebsiteEnrichmentWithAI, type AiExtractedPerson } from "@/lib/company-enrichment";
import { enrichCompanyPeople } from "@/lib/people-enrichment";
import { crawlCompanyWebsite, normalizeLinkedInUrl } from "@/lib/website-intelligence";

export type ScrapedPerson = {
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  linkedinSlug: string | null;
  sourceUrl: string;
  evidenceText: string;
  confidence: number;
};

type PersonnelScrapeResult = {
  people: ScrapedPerson[];
  pagesChecked: string[];
  postalAddress: string | null;
  postalAddressSourceUrl: string | null;
  contactPageUrl: string | null;
  companyLinkedinUrl: string | null;
  providerUsed: string | null;
  warnings: string[];
  error?: string;
};

export async function scrapePersonnelFromWebsite(websiteUrl: string): Promise<PersonnelScrapeResult> {
  const crawl = await crawlCompanyWebsite(websiteUrl, { maxPages: 8, focus: "people" });

  if (!crawl.baseUrl) {
    return {
      people: [],
      pagesChecked: [],
      postalAddress: null,
      postalAddressSourceUrl: null,
      contactPageUrl: null,
      companyLinkedinUrl: null,
      providerUsed: null,
      warnings: crawl.warnings,
      error: "Invalid URL",
    };
  }

  const heuristicPeople = crawl.pages.flatMap((page) => extractPeopleFromHtml(page.html, page.url));
  const aiEnrichment = await extractWebsiteEnrichmentWithAI({
    websiteUrl: crawl.baseUrl,
    pages: crawl.pages,
  });
  const providerEnrichment = await enrichCompanyPeople({
    websiteUrl: crawl.baseUrl,
  });

  const merged = mergePeople([
    ...heuristicPeople,
    ...aiEnrichment.people.map((person) => toScrapedPerson(person)),
    ...providerEnrichment.people.map((person) => toScrapedPerson(person)),
  ]).slice(0, 25);

  return {
    people: merged,
    pagesChecked: crawl.pagesChecked,
    postalAddress: aiEnrichment.postalAddress ?? providerEnrichment.postalAddress,
    postalAddressSourceUrl: aiEnrichment.postalAddressSourceUrl ?? crawl.contactPageUrl ?? crawl.baseUrl,
    contactPageUrl: crawl.contactPageUrl,
    companyLinkedinUrl:
      normalizeLinkedInUrl(aiEnrichment.companyLinkedinUrl) ??
      normalizeLinkedInUrl(providerEnrichment.companyLinkedinUrl) ??
      crawl.linkedinUrls.find((url) => /linkedin\.com\/company\//i.test(url)) ??
      null,
    providerUsed: providerEnrichment.provider,
    warnings: [...crawl.warnings, ...aiEnrichment.notes, ...providerEnrichment.warnings],
  };
}

function mergePeople(input: ScrapedPerson[]) {
  const merged = new Map<string, ScrapedPerson>();

  for (const person of input) {
    const normalized = normalizePerson(person);
    if (!normalized) continue;
    const key = normalized.email?.toLowerCase() ?? normalized.linkedinSlug ?? normalized.name.toLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, normalized);
      continue;
    }

    merged.set(key, {
      ...existing,
      jobTitle: pickBetter(existing.jobTitle, normalized.jobTitle),
      email: existing.email ?? normalized.email,
      phone: existing.phone ?? normalized.phone,
      linkedinUrl: existing.linkedinUrl ?? normalized.linkedinUrl,
      linkedinSlug: existing.linkedinSlug ?? normalized.linkedinSlug,
      sourceUrl: existing.sourceUrl || normalized.sourceUrl,
      evidenceText: pickLonger(existing.evidenceText, normalized.evidenceText),
      confidence: Math.max(existing.confidence, normalized.confidence),
    });
  }

  return [...merged.values()].sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));
}

function normalizePerson(person: ScrapedPerson): ScrapedPerson | null {
  const name = String(person.name ?? "").trim();
  if (!looksLikeName(name)) return null;
  const linkedinUrl = normalizeLinkedInUrl(person.linkedinUrl);
  return {
    ...person,
    name,
    jobTitle: person.jobTitle?.trim() || null,
    email: person.email?.trim().toLowerCase() || null,
    phone: person.phone?.trim() || null,
    linkedinUrl,
    linkedinSlug: extractLinkedInSlug(linkedinUrl),
    sourceUrl: person.sourceUrl,
    evidenceText: person.evidenceText?.trim() || name,
    confidence: Math.max(0, Math.min(100, person.confidence || 0)),
  };
}

function toScrapedPerson(person: AiExtractedPerson): ScrapedPerson {
  return {
    name: person.name,
    jobTitle: person.jobTitle,
    email: person.email,
    phone: person.phone,
    linkedinUrl: person.linkedinUrl,
    linkedinSlug: extractLinkedInSlug(person.linkedinUrl),
    sourceUrl: person.sourceUrl,
    evidenceText: person.evidenceText,
    confidence: person.confidence,
  };
}

function extractPeopleFromHtml(html: string, sourceUrl: string): ScrapedPerson[] {
  const people: ScrapedPerson[] = [];
  const clean = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script(?![^>]+application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, "");

  const linkedinUrls = new Map<string, string>();
  for (const match of clean.matchAll(/https?:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/gi)) {
    const slug = match[1]?.toLowerCase();
    if (slug) linkedinUrls.set(slug, match[0]);
  }

  people.push(...extractSchemaPersons(html, sourceUrl, linkedinUrls));
  people.push(...extractFromCardPatterns(clean, sourceUrl, linkedinUrls));
  people.push(...extractEmailPeople(clean, sourceUrl));

  return people;
}

function extractSchemaPersons(html: string, sourceUrl: string, linkedinUrls: Map<string, string>): ScrapedPerson[] {
  const people: ScrapedPerson[] = [];
  const jsonLdPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(jsonLdPattern)) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const persons = item["@type"] === "Person" ? [item] : [item.member, item.employee, item.founder].flat().filter(Boolean);
        for (const person of persons) {
          if (!person || typeof person !== "object") continue;
          const name = String(person.name ?? "").trim();
          if (!looksLikeName(name)) continue;
          const linkedinUrl = findLinkedInUrl([person.sameAs, person.url], linkedinUrls);
          people.push({
            name,
            jobTitle: String(person.jobTitle ?? person.description ?? "").trim() || null,
            email: extractEmail(String(person.email ?? "")),
            phone: extractPhone(String(person.telephone ?? "")),
            linkedinUrl,
            linkedinSlug: extractLinkedInSlug(linkedinUrl),
            sourceUrl,
            evidenceText: [name, person.jobTitle ?? person.description ?? null].filter(Boolean).join(" - "),
            confidence: 82,
          });
        }
      }
    } catch {
      continue;
    }
  }

  return people;
}

function extractFromCardPatterns(html: string, sourceUrl: string, linkedinUrls: Map<string, string>): ScrapedPerson[] {
  const people: ScrapedPerson[] = [];
  const pattern = /<h[1-4][^>]*>([^<]{3,80})<\/h[1-4]>\s*(?:<[^>]+>\s*){0,3}([^<]{0,120})/gi;

  for (const match of html.matchAll(pattern)) {
    const candidate = stripTags(match[1]).trim();
    if (!looksLikeName(candidate)) continue;
    const context = stripTags(match[2] ?? "").trim();
    const snippet = html.slice(match.index ?? 0, (match.index ?? 0) + 700);
    const linkedinMatch = snippet.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    const slug = linkedinMatch?.[1]?.toLowerCase() ?? null;
    const linkedinUrl = slug ? linkedinUrls.get(slug) ?? `https://www.linkedin.com/in/${slug}` : findLinkedInByName(candidate, linkedinUrls);
    people.push({
      name: candidate,
      jobTitle: looksLikeTitle(context) ? context : null,
      email: extractEmail(snippet),
      phone: extractPhone(snippet),
      linkedinUrl,
      linkedinSlug: extractLinkedInSlug(linkedinUrl),
      sourceUrl,
      evidenceText: [candidate, context || null].filter(Boolean).join(" - "),
      confidence: 68,
    });
    if (people.length >= 15) break;
  }

  return people;
}

function extractEmailPeople(html: string, sourceUrl: string): ScrapedPerson[] {
  const people: ScrapedPerson[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)) {
    const email = match[0]?.toLowerCase();
    if (!email || seen.has(email) || /example\.|noreply|no-reply/.test(email)) continue;
    seen.add(email);
    const before = stripTags(html.slice(Math.max(0, (match.index ?? 0) - 260), match.index ?? 0));
    const nameMatch = before.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*$/);
    const name = nameMatch?.[1] ?? email.split("@")[0];
    people.push({
      name,
      jobTitle: null,
      email,
      phone: null,
      linkedinUrl: null,
      linkedinSlug: null,
      sourceUrl,
      evidenceText: email,
      confidence: nameMatch ? 60 : 40,
    });
  }

  return people;
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractEmail(value: string): string | null {
  const match = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match?.[0]?.toLowerCase() ?? null;
}

function extractPhone(value: string): string | null {
  const match = value.match(/(?:\+\d{1,3}\s*)?(?:\(?\d{2,4}\)?[\s.-]*){2,4}\d{2,4}/);
  return match?.[0]?.trim() ?? null;
}

function looksLikeName(text: string): boolean {
  if (!text || text.length < 4 || text.length > 80) return false;
  if (/[<>{}@]/.test(text)) return false;
  return /^[A-Z][a-z]+(?:[\s-][A-Z][a-z.'-]+)+$/.test(text.trim());
}

function looksLikeTitle(text: string): boolean {
  if (!text || text.length < 3 || text.length > 100) return false;
  return /(founder|ceo|chief|director|head|manager|lead|marketing|sales|operations|growth|president|officer|owner|partner)/i.test(text);
}

function findLinkedInUrl(values: unknown[], linkedinUrls: Map<string, string>) {
  for (const value of values.flat()) {
    const normalized = normalizeLinkedInUrl(String(value ?? ""));
    if (normalized) return normalized;
  }
  for (const url of linkedinUrls.values()) {
    return url;
  }
  return null;
}

function findLinkedInByName(name: string, linkedinUrls: Map<string, string>): string | null {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (linkedinUrls.has(slug)) return linkedinUrls.get(slug)!;
  for (const [candidate, url] of linkedinUrls.entries()) {
    if (candidate.includes(slug.slice(0, 6))) return url;
  }
  return null;
}

function pickBetter(current: string | null, incoming: string | null) {
  if (!current) return incoming;
  if (!incoming) return current;
  return incoming.length > current.length ? incoming : current;
}

function pickLonger(current: string, incoming: string) {
  return incoming.length > current.length ? incoming : current;
}

function extractLinkedInSlug(url: string | null | undefined): string | null {
  const normalized = normalizeLinkedInUrl(url);
  const match = normalized?.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}
