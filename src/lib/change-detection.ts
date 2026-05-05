export type ChangeEvent = {
  entityType: "company" | "contact";
  changeType: "updated" | "added" | "removed";
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  sourceUrl?: string | null;
};

const COMPANY_FIELDS: Array<keyof CompanySnapshot> = [
  "name", "website_url", "industry", "city", "country", "description", "address_line",
];

const CONTACT_FIELDS: Array<keyof ContactSnapshot> = [
  "name", "job_title", "role_normalized", "department", "seniority",
  "linkedin_url", "work_email", "direct_phone", "employer_name",
];

export type CompanySnapshot = {
  name: string;
  website_url: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  address_line: string | null;
};

export type ContactSnapshot = {
  name: string | null;
  job_title: string | null;
  role_normalized: string | null;
  department: string | null;
  seniority: string | null;
  linkedin_url: string | null;
  work_email: string | null;
  direct_phone: string | null;
  employer_name: string | null;
};

export function detectCompanyChanges(
  stored: CompanySnapshot,
  fresh: Partial<CompanySnapshot>,
  sourceUrl?: string | null,
): ChangeEvent[] {
  const events: ChangeEvent[] = [];
  for (const field of COMPANY_FIELDS) {
    const oldVal = stored[field] ?? null;
    const newVal = fresh[field] ?? null;
    if (oldVal !== newVal && (oldVal || newVal)) {
      events.push({
        entityType: "company",
        changeType: newVal && !oldVal ? "added" : !newVal && oldVal ? "removed" : "updated",
        fieldName: field,
        oldValue: oldVal ? String(oldVal) : null,
        newValue: newVal ? String(newVal) : null,
        sourceUrl,
      });
    }
  }
  return events;
}

export function detectContactChanges(
  stored: ContactSnapshot,
  fresh: Partial<ContactSnapshot>,
  sourceUrl?: string | null,
): ChangeEvent[] {
  const events: ChangeEvent[] = [];
  for (const field of CONTACT_FIELDS) {
    const oldVal = stored[field] ?? null;
    const newVal = fresh[field] ?? null;
    if (oldVal !== newVal && (oldVal || newVal)) {
      events.push({
        entityType: "contact",
        changeType: newVal && !oldVal ? "added" : !newVal && oldVal ? "removed" : "updated",
        fieldName: field,
        oldValue: oldVal ? String(oldVal) : null,
        newValue: newVal ? String(newVal) : null,
        sourceUrl,
      });
    }
  }
  return events;
}

export function buildChangeSummary(events: ChangeEvent[]): string {
  if (events.length === 0) return "";
  return events
    .slice(0, 3)
    .map((e) => {
      const label = e.fieldName.replace(/_/g, " ");
      if (e.changeType === "added") return `${label} added`;
      if (e.changeType === "removed") return `${label} removed`;
      return `${label} changed from "${e.oldValue}" to "${e.newValue}"`;
    })
    .join("; ");
}
