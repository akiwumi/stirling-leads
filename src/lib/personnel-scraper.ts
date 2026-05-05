type ScrapedPerson = {
  name: string;
  jobTitle: string | null;
  email: string | null;
  linkedinUrl: string | null;
  linkedinSlug: string | null;
  sourceUrl: string;
  evidenceText: string;
};

type PersonnelScrapeResult = {
  people: ScrapedPerson[];
  pagesChecked: string[];
  error?: string;
};

const TEAM_PAGE_PATHS = ["/team", "/our-team", "/about", "/about-us", "/leadership", "/people", "/company", "/contact", "/staff"];

export async function scrapePersonnelFromWebsite(websiteUrl: string): Promise<PersonnelScrapeResult> {
  const base = getBaseUrl(websiteUrl);
  if (!base) return { people: [], pagesChecked: [], error: "Invalid URL" };

  const pagesChecked: string[] = [];
  const people: ScrapedPerson[] = [];
  const seenNames = new Set<string>();

  for (const path of TEAM_PAGE_PATHS) {
    const pageUrl = `${base}${path}`;
    try {
      const res = await fetch(pageUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; StirlingBot/1.0)" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });

      if (!res.ok) continue;

      const html = await res.text();
      pagesChecked.push(pageUrl);

      const found = extractPeopleFromHtml(html, pageUrl);
      for (const person of found) {
        const key = person.name.toLowerCase().trim();
        if (key.length < 2 || seenNames.has(key)) continue;
        seenNames.add(key);
        people.push(person);
      }

      if (people.length >= 20) break;
    } catch {
      // page unreachable — continue to next
    }
  }

  return { people, pagesChecked };
}

function getBaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

function extractPeopleFromHtml(html: string, sourceUrl: string): ScrapedPerson[] {
  const people: ScrapedPerson[] = [];

  // Strip scripts and styles
  const clean = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Extract LinkedIn URLs first so we can match them to names
  const linkedinPattern = /https?:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/g;
  const linkedinUrls = new Map<string, string>(); // slug -> full url
  let lm: RegExpExecArray | null;
  while ((lm = linkedinPattern.exec(clean)) !== null) {
    linkedinUrls.set(lm[1].toLowerCase(), lm[0]);
  }

  // Common structural patterns: card-like blocks with a name + title
  // Pattern 1: schema.org Person markup
  const schemaPersons = extractSchemaPersons(clean, sourceUrl, linkedinUrls);
  people.push(...schemaPersons);

  // Pattern 2: common card HTML patterns (h3/h4 + p siblings, or role/title near name)
  if (people.length < 3) {
    const cardPeople = extractFromCardPatterns(clean, sourceUrl, linkedinUrls);
    people.push(...cardPeople);
  }

  // Pattern 3: extract emails and try to pair them with names
  const emailPeople = extractEmailPeople(clean, sourceUrl);
  // Only add emails not already captured
  const existingEmails = new Set(people.map((p) => p.email).filter(Boolean));
  for (const ep of emailPeople) {
    if (ep.email && !existingEmails.has(ep.email)) {
      people.push(ep);
    }
  }

  return people;
}

function extractSchemaPersons(html: string, sourceUrl: string, linkedinUrls: Map<string, string>): ScrapedPerson[] {
  const people: ScrapedPerson[] = [];
  const jsonLdPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;

  while ((m = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const persons = item["@type"] === "Person" ? [item] : (item.member ?? item.employee ?? []);
        for (const p of Array.isArray(persons) ? persons : []) {
          if (p["@type"] !== "Person" && !p.name) continue;
          const name = String(p.name ?? "").trim();
          if (!name) continue;
          const jobTitle = String(p.jobTitle ?? p.description ?? "").trim() || null;
          const email = extractEmail(String(p.email ?? "")) || null;
          const slug = findLinkedInSlug(p.sameAs ?? [], linkedinUrls);
          people.push({
            name,
            jobTitle,
            email,
            linkedinUrl: slug ? `https://www.linkedin.com/in/${slug}` : findLinkedInByName(name, linkedinUrls),
            linkedinSlug: slug,
            sourceUrl,
            evidenceText: `${name}${jobTitle ? ` — ${jobTitle}` : ""}`,
          });
        }
      }
    } catch {
      // malformed JSON-LD
    }
  }

  return people;
}

function extractFromCardPatterns(html: string, sourceUrl: string, linkedinUrls: Map<string, string>): ScrapedPerson[] {
  const people: ScrapedPerson[] = [];

  // Look for common team card patterns:
  // <h3>Name</h3> followed by <p>Title</p> within ~500 chars
  const nameHeadingPattern = /<h[234][^>]*>([^<]{3,60})<\/h[234]>\s*(?:<[^>]+>\s*)*([^<]{3,80})?/gi;
  let m: RegExpExecArray | null;

  while ((m = nameHeadingPattern.exec(html)) !== null) {
    const candidate = stripTags(m[1]).trim();
    const context = stripTags(m[2] ?? "").trim();

    if (!looksLikeName(candidate)) continue;

    // Grab the next ~400 chars for more context (title, linkedin link)
    const snippet = html.slice(m.index, m.index + 500);
    const email = extractEmail(snippet);
    const linkedinMatch = snippet.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    const slug = linkedinMatch?.[1]?.toLowerCase() ?? null;
    const linkedinHref = slug ? (linkedinUrls.get(slug) ?? `https://www.linkedin.com/in/${slug}`) : findLinkedInByName(candidate, linkedinUrls);

    people.push({
      name: candidate,
      jobTitle: looksLikeTitle(context) ? context : null,
      email: email || null,
      linkedinUrl: linkedinHref,
      linkedinSlug: slug ?? extractLinkedInSlug(linkedinHref),
      sourceUrl,
      evidenceText: `${candidate}${context ? ` — ${context}` : ""}`,
    });

    if (people.length >= 15) break;
  }

  return people;
}

function extractEmailPeople(html: string, sourceUrl: string): ScrapedPerson[] {
  const people: ScrapedPerson[] = [];
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = emailPattern.exec(html)) !== null) {
    const email = m[0].toLowerCase();
    if (seen.has(email)) continue;
    if (email.includes("example.") || email.includes("noreply") || email.includes("no-reply")) continue;
    seen.add(email);

    // Try to find a name in the 300 chars before the email
    const before = stripTags(html.slice(Math.max(0, m.index - 300), m.index));
    const nameMatch = before.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*$/);

    people.push({
      name: nameMatch?.[1] ?? email.split("@")[0],
      jobTitle: null,
      email,
      linkedinUrl: null,
      linkedinSlug: null,
      sourceUrl,
      evidenceText: email,
    });
  }

  return people;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m?.[0]?.toLowerCase() ?? null;
}

function looksLikeName(text: string): boolean {
  if (text.length > 60 || text.length < 4) return false;
  if (/[<>{}\d@]/.test(text)) return false;
  // Must have at least two words starting with caps
  return /^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(text.trim());
}

function looksLikeTitle(text: string): boolean {
  if (!text || text.length > 80 || text.length < 3) return false;
  if (/[<>{}@]/.test(text)) return false;
  const titleWords = ["manager", "director", "head", "ceo", "cto", "cmo", "founder", "lead", "officer", "president", "vp", "engineer", "designer", "analyst", "consultant", "partner", "associate"];
  const lower = text.toLowerCase();
  return titleWords.some((w) => lower.includes(w));
}

function findLinkedInSlug(sameAs: unknown, linkedinUrls: Map<string, string>): string | null {
  const items = Array.isArray(sameAs) ? sameAs : [sameAs];
  for (const item of items) {
    const m = String(item ?? "").match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

function findLinkedInByName(name: string, linkedinUrls: Map<string, string>): string | null {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (linkedinUrls.has(slug)) return linkedinUrls.get(slug)!;
  for (const [s, url] of linkedinUrls.entries()) {
    if (s.includes(slug.slice(0, 6))) return url;
  }
  return null;
}

function extractLinkedInSlug(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/);
  return m?.[1] ?? null;
}
