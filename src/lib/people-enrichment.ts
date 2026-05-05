import { normalizeLinkedInUrl } from "@/lib/website-intelligence";

export type ProviderEnrichedPerson = {
  name: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  sourceUrl: string;
  evidenceText: string;
  confidence: number;
};

export type ProviderEnrichmentResult = {
  provider: string | null;
  people: ProviderEnrichedPerson[];
  postalAddress: string | null;
  companyLinkedinUrl: string | null;
  warnings: string[];
};

const TARGET_ROLE_SEARCHES = [
  "Founder",
  "CEO",
  "Chief Executive Officer",
  "Head of Marketing",
  "Marketing Director",
  "CMO",
  "Head of Sales",
  "Sales Director",
  "VP Sales",
  "COO",
  "Head of Operations",
];

export async function enrichCompanyPeople(input: {
  companyName?: string | null;
  websiteUrl: string;
}): Promise<ProviderEnrichmentResult> {
  const provider = (process.env.PEOPLE_ENRICHMENT_PROVIDER ?? "").trim().toLowerCase();
  const apiKey = process.env.PEOPLE_ENRICHMENT_API_KEY;

  if (!provider || !apiKey) {
    return { provider: null, people: [], postalAddress: null, companyLinkedinUrl: null, warnings: [] };
  }

  if (provider === "ninjapear") {
    return enrichWithNinjaPear(input.websiteUrl, apiKey);
  }

  return {
    provider,
    people: [],
    postalAddress: null,
    companyLinkedinUrl: null,
    warnings: [`Unsupported people enrichment provider: ${provider}`],
  };
}

async function enrichWithNinjaPear(websiteUrl: string, apiKey: string): Promise<ProviderEnrichmentResult> {
  const warnings: string[] = [];
  const people: ProviderEnrichedPerson[] = [];
  const seen = new Set<string>();
  let postalAddress: string | null = null;
  let companyLinkedinUrl: string | null = null;

  const companyDetails = await fetchJson("https://nubela.co/api/v1/company/details", apiKey, {
    website: websiteUrl,
    include_employee_count: "true",
  });

  if (companyDetails) {
    postalAddress = stringifyAddress(companyDetails.addresses?.[0] ?? null);
    companyLinkedinUrl = normalizeLinkedInUrl(companyDetails.linkedin_url ?? companyDetails.linkedin_company_profile_url ?? null);

    const executives = Array.isArray(companyDetails.executives) ? companyDetails.executives : [];
    for (const executive of executives) {
      const person = normalizeProviderPerson({
        name: executive.name,
        jobTitle: executive.role ?? executive.title ?? null,
        email: null,
        phone: null,
        linkedinUrl: executive.linkedin_url ?? executive.linkedin_profile_url ?? null,
        sourceUrl: "https://nubela.co/api/v1/company/details",
        evidenceText: [executive.name, executive.role ?? executive.title].filter(Boolean).join(" - "),
        confidence: 88,
      });
      if (person) pushPerson(people, seen, person);
    }
  } else {
    warnings.push("NinjaPear company details lookup failed.");
  }

  for (const role of TARGET_ROLE_SEARCHES) {
    const employees = await fetchJson("https://nubela.co/api/v1/employee/search", apiKey, {
      company_website: websiteUrl,
      role,
      page_size: "5",
    });

    const rows = Array.isArray(employees?.results) ? employees.results : Array.isArray(employees?.employees) ? employees.employees : [];

    for (const row of rows) {
      const person = normalizeProviderPerson({
        name: row.full_name ?? [row.first_name, row.last_name].filter(Boolean).join(" "),
        jobTitle: row.role ?? row.job_title ?? role,
        email: row.work_email ?? null,
        phone: row.phone ?? row.direct_phone ?? null,
        linkedinUrl: row.linkedin_url ?? row.linkedin_profile_url ?? null,
        sourceUrl: "https://nubela.co/api/v1/employee/search",
        evidenceText: [row.full_name ?? [row.first_name, row.last_name].filter(Boolean).join(" "), row.role ?? row.job_title ?? role]
          .filter(Boolean)
          .join(" - "),
        confidence: 84,
      });

      if (!person) continue;

      if (!person.email) {
        const [firstName, ...rest] = person.name.split(" ");
        const lastName = rest.join(" ").trim() || null;
        const workEmail = await fetchJson("https://nubela.co/api/v1/employee/work-email", apiKey, {
          first_name: firstName,
          ...(lastName ? { last_name: lastName } : {}),
          domain: safeHostname(websiteUrl),
        });
        if (typeof workEmail?.work_email === "string" && workEmail.work_email.includes("@")) {
          person.email = workEmail.work_email.toLowerCase();
          person.evidenceText = `${person.evidenceText} - ${person.email}`;
          person.confidence = Math.max(person.confidence, 90);
        }
      }

      pushPerson(people, seen, person);
    }
  }

  return {
    provider: "ninjapear",
    people,
    postalAddress,
    companyLinkedinUrl,
    warnings,
  };
}

async function fetchJson(endpoint: string, apiKey: string, params: Record<string, string>) {
  try {
    const url = new URL(endpoint);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, any>;
  } catch {
    return null;
  }
}

function stringifyAddress(value: any): string | null {
  if (!value || typeof value !== "object") return null;
  const parts = [value.line1, value.line2, value.city, value.state, value.postal_code, value.country_code]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
  return parts.length > 0 ? parts.join(", ") : null;
}

function normalizeProviderPerson(person: ProviderEnrichedPerson): ProviderEnrichedPerson | null {
  const name = String(person.name ?? "").trim();
  if (!name || name.length < 4) return null;

  return {
    ...person,
    name,
    jobTitle: person.jobTitle?.trim() || null,
    email: person.email?.trim().toLowerCase() || null,
    phone: person.phone?.trim() || null,
    linkedinUrl: normalizeLinkedInUrl(person.linkedinUrl) ?? null,
    sourceUrl: person.sourceUrl,
    evidenceText: person.evidenceText || name,
    confidence: Math.max(0, Math.min(100, person.confidence)),
  };
}

function pushPerson(target: ProviderEnrichedPerson[], seen: Set<string>, person: ProviderEnrichedPerson) {
  const key = person.email?.toLowerCase() ?? `${person.name.toLowerCase()}::${person.jobTitle?.toLowerCase() ?? ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  target.push(person);
}

function safeHostname(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? value;
  }
}
