import { analyzeCompanyWebsite } from "./company-analysis";
import { buildChangeSummary, detectCompanyChanges, detectContactChanges } from "./change-detection";
import {
  findMatchingContact,
  inferDepartment,
  inferSeniority,
  isDecisionMaker,
  normalizeRole,
  syncPersonnelCoverage,
} from "./people";
import { scrapePersonnelFromWebsite } from "./personnel-scraper";

type SupabaseClient = Awaited<ReturnType<typeof import("./supabase/server").createClient>>;

type RefreshResult = {
  companyId: string;
  changed: boolean;
  contactsChanged: number;
  newPeopleFound: number;
  error?: string;
};

export async function refreshCompany(supabase: SupabaseClient, companyId: string): Promise<RefreshResult> {
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) return { companyId, changed: false, contactsChanged: 0, newPeopleFound: 0, error: "Company not found" };

  const now = new Date().toISOString();
  let companyChanged = false;
  let previousCoverageStatus = company.personnel_coverage_status ?? "unknown";
  const changeEvents: Array<{
    company_id: string;
    contact_id?: string | null;
    entity_type: string;
    change_type: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    source_url: string | null;
    detected_at: string;
  }> = [];

  // Re-analyze the website
  if (company.website_url) {
    try {
      const analysis = await analyzeCompanyWebsite(company.website_url);

      const freshData = {
        description: analysis.summary ?? null,
        address_line: analysis.postalAddress ?? company.address_line ?? null,
      };

      const events = detectCompanyChanges(
        { name: company.name, website_url: company.website_url, industry: company.industry, city: company.city, country: company.country, description: company.description, address_line: company.address_line },
        freshData,
        company.website_url,
      );

      if (events.length > 0) {
        companyChanged = true;
        for (const e of events) {
          changeEvents.push({
            company_id: companyId,
            entity_type: "company",
            change_type: e.changeType,
            field_name: e.fieldName,
            old_value: e.oldValue,
            new_value: e.newValue,
            source_url: e.sourceUrl ?? null,
            detected_at: now,
          });
        }

        const updates: Record<string, string | null> = {};
        for (const e of events) {
          if (e.newValue !== null) updates[e.fieldName] = e.newValue;
        }

        await supabase.from("companies").update({
          ...updates,
          last_checked_at: now,
          last_changed_at: now,
          has_recent_changes: true,
          change_summary: buildChangeSummary(events),
        }).eq("id", companyId);
      } else {
        await supabase.from("companies").update({ last_checked_at: now, has_recent_changes: false }).eq("id", companyId);
      }
    } catch {
      await supabase.from("companies").update({ last_checked_at: now }).eq("id", companyId);
    }
  }

  // Re-scrape personnel
  let newPeopleFound = 0;
  let contactsChanged = 0;
  if (company.website_url) {
    try {
      const { people } = await scrapePersonnelFromWebsite(company.website_url);
      const { data: existingContacts } = await supabase
        .from("contacts")
        .select("*")
        .eq("company_id", companyId);

      for (const person of people) {
        const existing = findMatchingContact(existingContacts ?? [], {
          name: person.name,
          email: person.email,
          linkedinSlug: person.linkedinSlug,
        });
        const normalizedRole = normalizeRole(person.jobTitle);
        const freshSnapshot = {
          name: person.name,
          job_title: person.jobTitle,
          role_normalized: normalizedRole,
          department: inferDepartment(person.jobTitle),
          seniority: inferSeniority(person.jobTitle),
          linkedin_url: person.linkedinUrl,
            work_email: person.email,
            direct_phone: person.phone,
            employer_name: company.name,
          };

        if (!existing) {
          const { data: inserted } = await supabase.from("contacts").insert({
            company_id: companyId,
            name: person.name,
            job_title: person.jobTitle,
            role: person.jobTitle,
            role_normalized: normalizedRole,
            department: inferDepartment(person.jobTitle),
            seniority: inferSeniority(person.jobTitle),
            work_email: person.email,
            email: person.email,
            employer_name: company.name,
            direct_phone: person.phone,
            phone: person.phone,
            linkedin_url: person.linkedinUrl,
            linkedin_slug: person.linkedinSlug,
            source_url: person.sourceUrl,
            source_type: "website_refresh",
            source_confidence: person.confidence || 65,
            consent_basis: "public website",
            enrichment_status: "refreshed",
            is_decision_maker: isDecisionMaker(person.jobTitle, normalizedRole),
            last_checked_at: now,
            last_changed_at: now,
            has_recent_changes: true,
            change_summary: "New person discovered during refresh",
            updated_at: now,
          }).select("id").single();
          newPeopleFound++;
          companyChanged = true;
          changeEvents.push({
            company_id: companyId,
            contact_id: inserted?.id ?? null,
            entity_type: "contact",
            change_type: "added",
            field_name: "person",
            old_value: null,
            new_value: person.name,
            source_url: person.sourceUrl,
            detected_at: now,
          });
          continue;
        }

        const events = detectContactChanges(
          {
            name: existing.name,
            job_title: existing.job_title,
            role_normalized: existing.role_normalized,
            department: existing.department,
            seniority: existing.seniority,
            linkedin_url: existing.linkedin_url,
            work_email: existing.work_email ?? existing.email,
            direct_phone: existing.direct_phone ?? existing.phone,
            employer_name: existing.employer_name,
          },
          freshSnapshot,
          person.sourceUrl,
        );

        await supabase.from("contacts").update({
          ...freshSnapshot,
          role: person.jobTitle,
          email: person.email,
          phone: existing.phone,
          direct_phone: person.phone ?? existing.direct_phone,
          linkedin_slug: person.linkedinSlug,
          source_url: person.sourceUrl,
          source_type: "website_refresh",
          source_confidence: person.confidence || 65,
          consent_basis: existing.consent_basis ?? "public website",
          enrichment_status: "refreshed",
          is_decision_maker: isDecisionMaker(person.jobTitle, normalizedRole),
          last_checked_at: now,
          last_changed_at: events.length > 0 ? now : existing.last_changed_at,
          has_recent_changes: events.length > 0,
          change_summary: events.length > 0 ? buildChangeSummary(events) : existing.change_summary,
          updated_at: now,
        }).eq("id", existing.id);

        if (events.length > 0) {
          contactsChanged++;
          companyChanged = true;
          for (const event of events) {
            changeEvents.push({
              company_id: companyId,
              contact_id: existing.id,
              entity_type: "contact",
              change_type: event.changeType,
              field_name: event.fieldName,
              old_value: event.oldValue,
              new_value: event.newValue,
              source_url: event.sourceUrl ?? null,
              detected_at: now,
            });
          }
        }
      }
    } catch {
      // keep going
    }
  }

  // Check existing contacts against stored data
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("company_id", companyId)
    .not("source_url", "is", null);

  for (const contact of contacts ?? []) {
    if (!contact.source_url) continue;
    // We only flag contacts as refreshed without re-scraping each individual page
    // (full per-contact refresh would require dedicated source page per person)
    await supabase.from("contacts").update({ last_checked_at: now }).eq("id", contact.id);
  }

  const coverage = await syncPersonnelCoverage(supabase, companyId);
  if (coverage.status !== previousCoverageStatus) {
    changeEvents.push({
      company_id: companyId,
      entity_type: "company",
      change_type: "updated",
      field_name: "personnel_coverage_status",
      old_value: previousCoverageStatus,
      new_value: coverage.status,
      source_url: company.website_url,
      detected_at: now,
    });
    companyChanged = true;
  }

  // Persist change events
  if (changeEvents.length > 0) {
    await supabase.from("directory_change_events").insert(changeEvents);
  }

  return { companyId, changed: companyChanged || newPeopleFound > 0, contactsChanged, newPeopleFound };
}

export async function runBatchRefresh(
  supabase: SupabaseClient,
  userId: string,
  batchSize = 10,
): Promise<{ total: number; changed: number; errors: number }> {
  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("created_by", userId)
    .or("last_checked_at.is.null,last_checked_at.lt." + new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(batchSize);

  const { data: job } = await supabase
    .from("directory_refresh_jobs")
    .insert({
      created_by: userId,
      job_scope: "batch",
      status: "running",
      total_targets: (companies ?? []).length,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  let changed = 0;
  let errors = 0;

  for (const company of companies ?? []) {
    try {
      const result = await refreshCompany(supabase, company.id);
      if (result.changed) changed++;
    } catch {
      errors++;
    }
  }

  if (job) {
    await supabase.from("directory_refresh_jobs").update({
      status: "completed",
      processed_targets: (companies ?? []).length,
      changed_targets: changed,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
  }

  return { total: (companies ?? []).length, changed, errors };
}
