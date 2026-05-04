import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [{ data: companies }, { data: contacts }, { data: scores }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, website_url, industry, city, country, status, lead_score, lead_temperature, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("company_id, name, email"),
    supabase.from("lead_scores").select("company_id, qr_use_case, recommended_pitch, created_at").order("created_at", { ascending: false }),
  ]);

  const latestScoreByCompany = new Map<string, { qr_use_case: string | null; recommended_pitch: string | null }>();

  for (const score of scores ?? []) {
    if (!latestScoreByCompany.has(score.company_id)) {
      latestScoreByCompany.set(score.company_id, {
        qr_use_case: score.qr_use_case,
        recommended_pitch: score.recommended_pitch,
      });
    }
  }

  const contactNamesByCompany = new Map<string, string[]>();
  const contactEmailsByCompany = new Map<string, string[]>();

  for (const contact of contacts ?? []) {
    const names = contactNamesByCompany.get(contact.company_id) ?? [];
    const emails = contactEmailsByCompany.get(contact.company_id) ?? [];

    if (contact.name) {
      names.push(contact.name);
      contactNamesByCompany.set(contact.company_id, names);
    }

    if (contact.email) {
      emails.push(contact.email);
      contactEmailsByCompany.set(contact.company_id, emails);
    }
  }

  const rows = (companies ?? []).map((company) => {
    const score = latestScoreByCompany.get(company.id);

    return {
      Company: company.name,
      Website: company.website_url ?? "",
      Industry: company.industry ?? "",
      City: company.city ?? "",
      Country: company.country ?? "",
      Status: company.status ?? "",
      "Lead Score": company.lead_score ?? 0,
      Temperature: company.lead_temperature ?? "",
      "QR Use Case": score?.qr_use_case ?? "",
      "Recommended Pitch": score?.recommended_pitch ?? "",
      Contacts: (contactNamesByCompany.get(company.id) ?? []).join(", "),
      Emails: (contactEmailsByCompany.get(company.id) ?? []).join(", "),
      "Created At": company.created_at,
    };
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Companies");
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="stirling-companies.xlsx"',
    },
  });
}
