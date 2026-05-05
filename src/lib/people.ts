export type RoleTargetBlueprint = {
  roleBucket: string;
  roleLabel: string;
  priority: number;
};

type ContactLike = {
  id: string;
  name?: string | null;
  job_title?: string | null;
  role?: string | null;
  role_normalized?: string | null;
  seniority?: string | null;
  department?: string | null;
  linkedin_url?: string | null;
  linkedin_slug?: string | null;
  work_email?: string | null;
  email?: string | null;
  direct_phone?: string | null;
  phone?: string | null;
  is_decision_maker?: boolean | null;
  created_at?: string | null;
};

type RoleTargetRow = {
  id: string;
  company_id: string;
  role_bucket: string;
  role_label: string;
  priority: number;
  status: string;
  primary_contact_id: string | null;
  notes: string | null;
};

type CoverageSummary = {
  status: "complete" | "partial" | "missing_key_roles";
  gapNotes: string | null;
  targets: RoleTargetRow[];
};

type SupabaseLike = {
  from: (table: string) => any;
};

export const DEFAULT_ROLE_TARGETS: RoleTargetBlueprint[] = [
  { roleBucket: "Executive", roleLabel: "Founder / CEO", priority: 1 },
  { roleBucket: "Marketing", roleLabel: "Marketing lead", priority: 1 },
  { roleBucket: "Sales", roleLabel: "Sales lead", priority: 1 },
  { roleBucket: "Operations", roleLabel: "Operations lead", priority: 2 },
];

export function normalizeLinkedInUrl(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  try {
    const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (!hostname.endsWith("linkedin.com")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] !== "in" || !parts[1]) return null;

    return `https://www.linkedin.com/in/${parts[1]}`;
  } catch {
    return null;
  }
}

export function extractLinkedInSlug(url: string | null | undefined): string | null {
  const normalized = normalizeLinkedInUrl(url);
  if (!normalized) return null;
  const match = normalized.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function normalizeRole(title: string | null | undefined): string | null {
  if (!title) return null;

  const value = title.toLowerCase();
  if (/founder|owner|co-founder|ceo|chief executive|managing director|\bmd\b|president/.test(value)) return "Executive";
  if (/cto|chief tech|chief technology|vp eng|head of eng|engineering/.test(value)) return "Engineering";
  if (/cmo|chief marketing|head of marketing|marketing director|growth|demand gen|brand/.test(value)) return "Marketing";
  if (/cso|chief sales|head of sales|sales director|vp sales|business development|\bbdr\b|\bsdr\b|account executive/.test(value)) return "Sales";
  if (/coo|chief operating|operations|\bops\b|logistics/.test(value)) return "Operations";
  if (/cfo|chief financial|finance|accounting|controller/.test(value)) return "Finance";
  if (/customer success|account manager|support|customer care/.test(value)) return "Customer Success";
  if (/product manager|\bpm\b|product director|product lead/.test(value)) return "Product";
  if (/design|ux|ui|creative/.test(value)) return "Design";
  if (/hr|people ops|people partner|talent|recruit/.test(value)) return "HR";
  return "Other";
}

export function inferSeniority(title: string | null | undefined): string | null {
  if (!title) return null;
  const value = title.toLowerCase();
  if (/chief|ceo|cto|cfo|coo|cmo|founder|president/.test(value)) return "c_suite";
  if (/vp|vice president|director/.test(value)) return "vp";
  if (/head|manager|lead/.test(value)) return "manager";
  return "individual";
}

export function inferDepartment(title: string | null | undefined, currentDepartment?: string | null): string | null {
  if (currentDepartment) return currentDepartment;
  return normalizeRole(title);
}

export function isDecisionMaker(title: string | null | undefined, roleNormalized?: string | null): boolean {
  if (!title && !roleNormalized) return false;
  const value = `${title ?? ""} ${roleNormalized ?? ""}`.toLowerCase();
  return /chief|founder|owner|president|vp|vice president|director|head/.test(value);
}

export function normalizePersonName(name: string | null | undefined): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function pickContactEmail(contact: Pick<ContactLike, "work_email" | "email">): string | null {
  return (contact.work_email ?? contact.email ?? null)?.toLowerCase() ?? null;
}

export function pickContactPhone(contact: Pick<ContactLike, "direct_phone" | "phone">): string | null {
  return contact.direct_phone ?? contact.phone ?? null;
}

export function buildContactMatchKeys(input: {
  name?: string | null;
  email?: string | null;
  linkedinSlug?: string | null;
}) {
  return {
    email: input.email?.toLowerCase() ?? null,
    linkedinSlug: input.linkedinSlug?.toLowerCase() ?? null,
    normalizedName: normalizePersonName(input.name),
  };
}

export function findMatchingContact<T extends ContactLike>(
  contacts: T[],
  input: {
    name?: string | null;
    email?: string | null;
    linkedinSlug?: string | null;
  },
): T | null {
  const needle = buildContactMatchKeys(input);

  for (const contact of contacts) {
    const email = pickContactEmail(contact);
    if (needle.email && email && needle.email === email) return contact;
  }

  for (const contact of contacts) {
    if (needle.linkedinSlug && contact.linkedin_slug?.toLowerCase() === needle.linkedinSlug) return contact;
  }

  if (!needle.normalizedName) return null;

  for (const contact of contacts) {
    if (normalizePersonName(contact.name) === needle.normalizedName) return contact;
  }

  return null;
}

export async function ensureDefaultRoleTargets(supabase: SupabaseLike, companyId: string) {
  const rows = DEFAULT_ROLE_TARGETS.map((target) => ({
    company_id: companyId,
    role_bucket: target.roleBucket,
    role_label: target.roleLabel,
    priority: target.priority,
  }));

  await supabase.from("company_role_targets").upsert(rows, {
    onConflict: "company_id,role_bucket,role_label",
    ignoreDuplicates: true,
  });
}

export async function syncPersonnelCoverage(
  supabase: SupabaseLike,
  companyId: string,
  contactsInput?: ContactLike[],
): Promise<CoverageSummary> {
  await ensureDefaultRoleTargets(supabase, companyId);

  const [{ data: fetchedTargets }, { data: fetchedContacts }] = await Promise.all([
    supabase
      .from("company_role_targets")
      .select("id, company_id, role_bucket, role_label, priority, status, primary_contact_id, notes")
      .eq("company_id", companyId)
      .order("priority", { ascending: true })
      .order("role_label", { ascending: true }),
    contactsInput
      ? Promise.resolve({ data: contactsInput })
      : supabase
          .from("contacts")
          .select("id, name, job_title, role, role_normalized, seniority, department, linkedin_url, linkedin_slug, work_email, email, direct_phone, phone, is_decision_maker, created_at")
          .eq("company_id", companyId),
  ]);

  const targets = (fetchedTargets ?? []) as RoleTargetRow[];
  const contacts = (fetchedContacts ?? []) as ContactLike[];
  const now = new Date().toISOString();

  for (const target of targets) {
    const candidates = contacts
      .filter((contact) => contact.role_normalized === target.role_bucket)
      .sort((a, b) => {
        const decisionWeight = Number(Boolean(b.is_decision_maker)) - Number(Boolean(a.is_decision_maker));
        if (decisionWeight !== 0) return decisionWeight;
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });

    const matched = candidates[0] ?? null;
    const manualCovered = target.status === "covered" && !target.primary_contact_id;

    await supabase
      .from("company_role_targets")
      .update({
        status: matched || manualCovered ? "covered" : "missing",
        primary_contact_id: matched?.id ?? null,
        updated_at: now,
      })
      .eq("id", target.id);

    target.status = matched || manualCovered ? "covered" : "missing";
    target.primary_contact_id = matched?.id ?? null;
  }

  const requiredTargets = targets.filter((target) => target.priority <= 1);
  const missingRequired = requiredTargets.filter((target) => target.status !== "covered");
  const status =
    missingRequired.length === 0
      ? "complete"
      : missingRequired.length === requiredTargets.length
        ? "missing_key_roles"
        : "partial";
  const gapNotes = missingRequired.length
    ? `Missing: ${missingRequired.map((target) => target.role_label).join(", ")}`
    : null;

  await supabase
    .from("companies")
    .update({
      personnel_coverage_status: status,
      personnel_gap_notes: gapNotes,
      last_personnel_audit_at: now,
    })
    .eq("id", companyId);

  return { status, gapNotes, targets };
}
