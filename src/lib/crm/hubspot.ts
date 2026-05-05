export type HubSpotCompany = {
  name: string;
  domain?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
};

export type HubSpotContact = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  linkedinUrl?: string | null;
  companyName?: string | null;
};

export type HubSpotPushResult = {
  ok: boolean;
  objectId?: string;
  error?: string;
};

type HubSpotAuthOptions = {
  accessToken?: string | null;
};

function getApiKey(options?: HubSpotAuthOptions): string | null {
  return options?.accessToken ?? process.env.HUBSPOT_API_KEY ?? null;
}

function buildHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function pushCompanyToHubSpot(company: HubSpotCompany, options?: HubSpotAuthOptions): Promise<HubSpotPushResult> {
  const apiKey = getApiKey(options);
  if (!apiKey) return { ok: false, error: "HUBSPOT_API_KEY not configured" };

  const properties: Record<string, string> = {
    name: company.name,
  };
  if (company.domain) properties.domain = company.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (company.industry) properties.industry = company.industry;
  if (company.city) properties.city = company.city;
  if (company.country) properties.country = company.country;
  if (company.description) properties.description = company.description;

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies", {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    const body = await res.text();
    // Handle duplicate company — return existing ID
    if (res.status === 409) {
      const parsed = JSON.parse(body) as { message?: string };
      const match = parsed.message?.match(/existing ID (\d+)/);
      if (match) return { ok: true, objectId: match[1] };
    }
    return { ok: false, error: `HubSpot error ${res.status}: ${body}` };
  }

  const data = (await res.json()) as { id: string };
  return { ok: true, objectId: data.id };
}

export async function pushContactToHubSpot(contact: HubSpotContact, options?: HubSpotAuthOptions): Promise<HubSpotPushResult> {
  const apiKey = getApiKey(options);
  if (!apiKey) return { ok: false, error: "HUBSPOT_API_KEY not configured" };

  const nameParts = (contact.fullName ?? "").trim().split(/\s+/);
  const firstName = contact.firstName || nameParts[0] || "";
  const lastName = contact.lastName || nameParts.slice(1).join(" ") || "";

  const properties: Record<string, string> = {};
  if (firstName) properties.firstname = firstName;
  if (lastName) properties.lastname = lastName;
  if (contact.email) properties.email = contact.email;
  if (contact.phone) properties.phone = contact.phone;
  if (contact.jobTitle) properties.jobtitle = contact.jobTitle;
  if (contact.linkedinUrl) properties.hs_linkedin_profile_url = contact.linkedinUrl;
  if (contact.companyName) properties.company = contact.companyName;

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 409) {
      const parsed = JSON.parse(body) as { message?: string };
      const match = parsed.message?.match(/existing ID (\d+)/);
      if (match) return { ok: true, objectId: match[1] };
    }
    return { ok: false, error: `HubSpot error ${res.status}: ${body}` };
  }

  const data = (await res.json()) as { id: string };
  return { ok: true, objectId: data.id };
}

export function isHubSpotConfigured(): boolean {
  return Boolean(process.env.HUBSPOT_API_KEY);
}
