import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceOwnerId } from "@/lib/workspace";

type SheetRow = Record<string, string | number>;

type CompanyRow = {
  id: string;
  name: string;
  website_url: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  lead_score: number | null;
  personnel_coverage_status: string | null;
  personnel_gap_notes: string | null;
  last_checked_at: string | null;
  last_changed_at: string | null;
  change_summary: string | null;
};

type ContactRow = {
  id: string;
  company_id: string | null;
  name: string | null;
  job_title: string | null;
  role: string | null;
  role_normalized: string | null;
  management_level: string | null;
  department: string | null;
  seniority: string | null;
  is_decision_maker: boolean | null;
  linkedin_url: string | null;
  work_email: string | null;
  email: string | null;
  direct_phone: string | null;
  mobile_phone: string | null;
  source_url: string | null;
  last_checked_at: string | null;
  last_changed_at: string | null;
  change_summary: string | null;
};

type ContactSourceRow = {
  contact_id: string;
  source_kind: string;
  source_label: string | null;
  source_url: string | null;
  created_at: string;
};

function addSheet(workbook: XLSX.WorkBook, rows: SheetRow[], sheetName: string, colWidths: number[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  ws["!autofilter"] = { ref: ws["!ref"] ?? "A1" };
  ws["!cols"] = colWidths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, ws, sheetName);
}

function isoToLocal(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB");
}

function one<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function buildCompaniesRows(companies: CompanyRow[]): SheetRow[] {
  return companies.map((company) => ({
    "Company ID": company.id,
    "Company Name": company.name,
    Website: company.website_url ?? "",
    Industry: company.industry ?? "",
    City: company.city ?? "",
    Country: company.country ?? "",
    "Lead Score": company.lead_score ?? 0,
    "Personnel Coverage Status": company.personnel_coverage_status ?? "",
    "Missing Roles": company.personnel_gap_notes ?? "",
    "Last Checked": isoToLocal(company.last_checked_at),
    "Last Changed": isoToLocal(company.last_changed_at),
    "Change Summary": company.change_summary ?? "",
  }));
}

function buildPeopleRows(contacts: ContactRow[], companyById: Map<string, CompanyRow>): SheetRow[] {
  return contacts.map((contact) => {
    const company = contact.company_id ? companyById.get(contact.company_id) : null;
    return {
      "Contact ID": contact.id,
      "Company ID": contact.company_id ?? "",
      "Company Name": company?.name ?? "",
      "Full Name": contact.name ?? "",
      "Job Title": contact.job_title ?? contact.role ?? "",
      "Normalized Role": contact.role_normalized ?? "",
      "Management Level": contact.management_level ?? contact.seniority ?? "",
      "Decision Maker": contact.is_decision_maker ? "Yes" : "No",
      "LinkedIn URL": contact.linkedin_url ?? "",
      "Work Email": contact.work_email ?? contact.email ?? "",
      "Direct Phone": contact.direct_phone ?? "",
      "Source URL": contact.source_url ?? "",
      "Last Checked": isoToLocal(contact.last_checked_at),
      "Last Changed": isoToLocal(contact.last_changed_at),
    };
  });
}

function buildCompanyContactsRows(
  contacts: ContactRow[],
  companyById: Map<string, CompanyRow>,
  sourceByContactId: Map<string, ContactSourceRow>,
): SheetRow[] {
  return [...contacts]
    .sort((a, b) => {
      const companyA = companyById.get(a.company_id ?? "")?.name ?? "";
      const companyB = companyById.get(b.company_id ?? "")?.name ?? "";
      if (companyA !== companyB) return companyA.localeCompare(companyB);

      const roleA = a.role_normalized ?? "";
      const roleB = b.role_normalized ?? "";
      if (roleA !== roleB) return roleA.localeCompare(roleB);

      return (a.name ?? "").localeCompare(b.name ?? "");
    })
    .map((contact) => {
      const company = companyById.get(contact.company_id ?? "");
      const latestSource = sourceByContactId.get(contact.id);
      return {
        "Company Name": company?.name ?? "",
        "Personnel Coverage Status": company?.personnel_coverage_status ?? "",
        "Contact Full Name": contact.name ?? "",
        "Job Title": contact.job_title ?? contact.role ?? "",
        "Normalized Role": contact.role_normalized ?? "",
        Department: contact.department ?? "",
        "Decision Maker": contact.is_decision_maker ? "Yes" : "No",
        "LinkedIn URL": contact.linkedin_url ?? "",
        "Work Email": contact.work_email ?? contact.email ?? "",
        "Direct Phone": contact.direct_phone ?? "",
        "Mobile Phone": contact.mobile_phone ?? "",
        "Source Label": latestSource?.source_label ?? latestSource?.source_kind.replace(/_/g, " ") ?? "",
        "Source URL": latestSource?.source_url ?? contact.source_url ?? "",
        "Change Summary": contact.change_summary ?? "",
      };
    });
}

function buildListsRows(listMembers: Array<any>): SheetRow[] {
  return listMembers.flatMap((member) => {
    const list = one(member.person_lists as { name: string } | { name: string }[]);
    const contact = one(
      member.contacts as
        | {
            name: string | null;
            job_title: string | null;
            role: string | null;
            role_normalized: string | null;
            linkedin_url: string | null;
            work_email: string | null;
            email: string | null;
            companies: { name: string } | { name: string }[] | null;
          }
        | {
            name: string | null;
            job_title: string | null;
            role: string | null;
            role_normalized: string | null;
            linkedin_url: string | null;
            work_email: string | null;
            email: string | null;
            companies: { name: string } | { name: string }[] | null;
          }[]
        | null,
    );
    if (!list || !contact) return [];

    const company = one(contact.companies as { name: string } | { name: string }[]);
    return [
      {
        "List Name": list.name,
        "Company Name": company?.name ?? "",
        "Contact Name": contact.name ?? "",
        "Job Title": contact.job_title ?? contact.role ?? "",
        "Normalized Role": contact.role_normalized ?? "",
        "LinkedIn URL": contact.linkedin_url ?? "",
        "Work Email": contact.work_email ?? contact.email ?? "",
      },
    ];
  });
}

function buildUpdatesRows(changeEvents: Array<any>): SheetRow[] {
  return changeEvents.flatMap((event) => {
    const company = one(event.companies as { name: string } | { name: string }[]);
    const contact = one(event.contacts as { name: string } | { name: string }[]);
    if (!company) return [];

    return [
      {
        "Detected At": isoToLocal(event.detected_at),
        "Entity Type": event.entity_type ?? "",
        "Company Name": company.name,
        "Contact Name": contact?.name ?? "",
        "Field Name": String(event.field_name ?? "").replace(/_/g, " "),
        "Old Value": event.old_value ?? "",
        "New Value": event.new_value ?? "",
        "Source URL": event.source_url ?? "",
        "Refresh Job ID": event.refresh_job_id ?? "",
      },
    ];
  });
}

function buildCrmRows(crmJobs: Array<any>): SheetRow[] {
  return crmJobs.map((job) => {
    const company = one(job.companies as { name: string } | { name: string }[]);
    const contact = one(job.contacts as { name: string } | { name: string }[]);
    const connection = one(job.crm_connections as { provider: string } | { provider: string }[]);

    return {
      Provider: connection?.provider ?? "",
      "Company Name": company?.name ?? "",
      "Contact Name": contact?.name ?? "",
      Direction: job.direction ?? "",
      "Object Type": job.provider_object_type ?? "",
      Status: job.status ?? "",
      "Error Message": job.error_message ?? "",
      "Created At": isoToLocal(job.created_at),
    };
  });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, website_url, industry, city, country, lead_score, personnel_coverage_status, personnel_gap_notes, last_checked_at, last_changed_at, change_summary")
    .eq("created_by", workspaceOwnerId)
    .order("name");

  const companyIds = (companies ?? []).map((company) => company.id);
  const companyById = new Map((companies ?? []).map((company) => [company.id, company]));

  const [
    { data: contacts },
    { data: contactSources },
    { data: listMembers },
    { data: changeEvents },
    { data: crmConnections },
  ] = await Promise.all([
    companyIds.length > 0
      ? supabase
          .from("contacts")
          .select("id, company_id, name, job_title, role, role_normalized, management_level, department, seniority, is_decision_maker, linkedin_url, work_email, email, direct_phone, mobile_phone, source_url, last_checked_at, last_changed_at, change_summary")
          .in("company_id", companyIds)
      : Promise.resolve({ data: [] as ContactRow[] }),
    companyIds.length > 0
      ? supabase
          .from("contact_sources")
          .select("contact_id, source_kind, source_label, source_url, created_at")
          .in("company_id", companyIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ContactSourceRow[] }),
    supabase
      .from("person_list_members")
      .select("list_id, contact_id, created_at, person_lists!inner(name, created_by), contacts(name, job_title, role, role_normalized, linkedin_url, work_email, email, companies(name))")
      .eq("person_lists.created_by", workspaceOwnerId)
      .order("created_at"),
    companyIds.length > 0
      ? supabase
          .from("directory_change_events")
          .select("id, entity_type, field_name, old_value, new_value, source_url, detected_at, refresh_job_id, companies(name), contacts(name)")
          .in("company_id", companyIds)
          .order("detected_at", { ascending: false })
          .limit(2000)
      : Promise.resolve({ data: [] as Array<any> }),
    supabase
      .from("crm_connections")
      .select("id")
      .eq("created_by", workspaceOwnerId),
  ]);

  const connectionIds = (crmConnections ?? []).map((connection) => connection.id);
  const { data: crmJobs } = connectionIds.length > 0
    ? await supabase
        .from("crm_sync_jobs")
        .select("id, direction, provider_object_type, status, error_message, created_at, companies(name), contacts(name), crm_connections(provider)")
        .in("crm_connection_id", connectionIds)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] as Array<any> };

  const latestSourceByContactId = new Map<string, ContactSourceRow>();
  for (const source of contactSources ?? []) {
    if (!latestSourceByContactId.has(source.contact_id)) {
      latestSourceByContactId.set(source.contact_id, source);
    }
  }

  const workbook = XLSX.utils.book_new();
  addSheet(workbook, buildCompaniesRows(companies ?? []), "Companies", [36, 30, 30, 18, 16, 16, 12, 22, 38, 20, 20, 50]);
  addSheet(workbook, buildPeopleRows(contacts ?? [], companyById), "People", [36, 36, 28, 24, 24, 20, 18, 14, 40, 34, 18, 40, 20, 20]);
  addSheet(workbook, buildCompanyContactsRows(contacts ?? [], companyById, latestSourceByContactId), "Company Contacts", [28, 22, 24, 24, 20, 16, 14, 40, 34, 18, 18, 18, 40, 50]);
  addSheet(workbook, buildListsRows(listMembers ?? []), "Lists", [30, 28, 24, 24, 20, 40, 34]);
  addSheet(workbook, buildUpdatesRows(changeEvents ?? []), "Updates", [20, 14, 28, 24, 20, 40, 40, 40, 36]);
  addSheet(workbook, buildCrmRows(crmJobs ?? []), "CRM Sync", [16, 28, 24, 14, 16, 12, 50, 20]);

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="stirling-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
