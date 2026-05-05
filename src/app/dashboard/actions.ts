"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { analyzeCompanyWebsite } from "@/lib/company-analysis";
import { pushCompanyToHubSpot, pushContactToHubSpot } from "@/lib/crm/hubspot";
import { refreshCompany } from "@/lib/directory-refresh";
import { buildDemoLandingConfig, buildQrCodeDataUrl } from "@/lib/demo";
import { generateEmailDraft } from "@/lib/email-draft";
import { buildSearchQuery, extractCompanyName, inferCountryFromHostname, inferCountryFromSearch, isLikelyAggregatorSite, lookupCountryForLocation, normalizeWebsiteUrl } from "@/lib/leads";
import { scoreLeadWithAI } from "@/lib/lead-score";
import {
  extractLinkedInSlug,
  findMatchingContact,
  inferDepartment,
  inferSeniority,
  isDecisionMaker,
  normalizeLinkedInUrl,
  normalizeRole,
  syncPersonnelCoverage,
  ensureDefaultRoleTargets,
} from "@/lib/people";
import { scrapePersonnelFromWebsite } from "@/lib/personnel-scraper";
import { createClient } from "@/lib/supabase/server";
import {
  assertUsageWithinLimit,
  buildSeatLimitRedirect,
  buildUsageLimitRedirect,
  getSeatSummary,
  incrementUsage,
  USAGE_METRICS,
} from "@/lib/usage-limits";
import { getWorkspaceContext } from "@/lib/workspace";
import { Resend } from "resend";

type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
};

type LeadScoreShape = {
  score: number;
  category: string;
  qrUseCase: string;
  reason: string;
  confidence: number;
  recommendedPitch: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getWorkspaceContext(supabase, user.id);

  return { supabase, user, workspace };
}

function redirectForUsageLimit(metric: keyof typeof USAGE_METRICS | string, targetPath: string) {
  redirect(buildUsageLimitRedirect(targetPath, metric as (typeof USAGE_METRICS)[keyof typeof USAGE_METRICS]));
}

async function analyzeWebsiteForCompany(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string, websiteUrl: string) {
  const result = await analyzeCompanyWebsite(websiteUrl);

  await supabase.from("lead_sources").delete().eq("company_id", companyId).like("source_type", "analysis_%");

  if (result.summary) {
    await supabase.from("companies").update({ description: result.summary }).eq("id", companyId);
  }

  if (result.findings.length > 0) {
    await supabase.from("lead_sources").insert(
      result.findings.map((finding) => ({
        company_id: companyId,
        source_url: finding.sourceUrl,
        source_type: finding.sourceType,
        found_text: finding.foundText,
      })),
    );
  }

  return result;
}

async function syncExtractedCompanyContactData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  extracted: {
    primaryEmail: string | null;
    postalAddress: string | null;
    contactPageUrl: string | null;
  },
) {
  if (extracted.postalAddress) {
    await supabase
      .from("companies")
      .update({
        address_line: extracted.postalAddress,
      })
      .eq("id", companyId);
  }

  if (!extracted.primaryEmail) {
    return;
  }

  const normalizedEmail = extracted.primaryEmail.toLowerCase();
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("id, source_url, contact_type, consent_basis")
    .eq("company_id", companyId)
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingContact) {
    await supabase
      .from("contacts")
      .update({
        source_url: existingContact.source_url || extracted.contactPageUrl,
        contact_type: existingContact.contact_type || "website inbox",
        consent_basis: existingContact.consent_basis || "public website",
      })
      .eq("id", existingContact.id);

    return;
  }

  await supabase.from("contacts").insert({
    company_id: companyId,
    name: "Website contact",
    role: "General enquiries",
    email: normalizedEmail,
    contact_type: "website inbox",
    source_url: extracted.contactPageUrl,
    consent_basis: "public website",
  });
}

async function upsertCompanyContact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  input: {
    name?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    seniority?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    contactType?: string | null;
    sourceUrl?: string | null;
    consentBasis?: string | null;
    sourceType?: string | null;
    sourceConfidence?: number | null;
    enrichmentStatus?: string | null;
  },
) {
  const linkedinUrl = normalizeLinkedInUrl(input.linkedinUrl);
  const linkedinSlug = extractLinkedInSlug(linkedinUrl);
  const email = input.email?.trim().toLowerCase() || null;
  const jobTitle = input.jobTitle?.trim() || null;
  const department = inferDepartment(jobTitle, input.department?.trim() || null);
  const seniority = input.seniority?.trim() || inferSeniority(jobTitle);
  const roleNormalized = normalizeRole(jobTitle);

  const { data: existingContacts } = await supabase
    .from("contacts")
    .select("id, name, linkedin_slug, work_email, email, consent_basis, source_url, contact_type")
    .eq("company_id", companyId);

  const existing = findMatchingContact(existingContacts ?? [], {
    name: input.name ?? null,
    email,
    linkedinSlug,
  });

  const payload = {
    company_id: companyId,
    name: input.name?.trim() || null,
    role: jobTitle,
    job_title: jobTitle,
    seniority,
    department,
    email,
    work_email: email,
    phone: input.phone?.trim() || null,
    direct_phone: input.phone?.trim() || null,
    linkedin_url: linkedinUrl,
    linkedin_slug: linkedinSlug,
    contact_type: input.contactType?.trim() || null,
    source_url: input.sourceUrl?.trim() || null,
    consent_basis: input.consentBasis?.trim() || null,
    role_normalized: roleNormalized,
    source_type: input.sourceType ?? "manual",
    source_confidence: input.sourceConfidence ?? 100,
    enrichment_status: input.enrichmentStatus ?? null,
    is_decision_maker: isDecisionMaker(jobTitle, roleNormalized),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data } = await supabase
      .from("contacts")
      .update({
        ...payload,
        source_url: payload.source_url ?? existing.source_url ?? null,
        contact_type: payload.contact_type ?? existing.contact_type ?? null,
        consent_basis: payload.consent_basis ?? existing.consent_basis ?? null,
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    return { id: data?.id ?? existing.id, inserted: false };
  }

  const { data } = await supabase
    .from("contacts")
    .insert(payload)
    .select("id")
    .single();

  return { id: data?.id ?? null, inserted: true };
}

async function getCrmConnection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  provider: string,
) {
  const { data } = await supabase
    .from("crm_connections")
    .select("id, access_token, provider")
    .eq("created_by", userId)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle();

  return data;
}

async function scoreCompanyLead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  company: {
    name: string;
    website_url: string | null;
    industry: string | null;
    city: string | null;
    country: string | null;
    description: string | null;
  },
) {
  const { data: evidence } = await supabase
    .from("lead_sources")
    .select("source_type, source_url, found_text")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if ((evidence ?? []).length === 0) {
    throw new Error("Missing evidence");
  }

  const result = await scoreLeadWithAI({
    company: {
      name: company.name,
      websiteUrl: company.website_url,
      industry: company.industry,
      city: company.city,
      country: company.country,
      description: company.description,
    },
    evidence: (evidence ?? []).map((item) => ({
      sourceType: item.source_type,
      sourceUrl: item.source_url,
      foundText: item.found_text,
    })),
  });

  await supabase.from("lead_scores").insert({
    company_id: companyId,
    score: result.score,
    category: result.category,
    qr_use_case: result.qrUseCase,
    reason: result.reason,
    recommended_pitch: result.recommendedPitch,
    confidence: result.confidence,
    ai_model: process.env.OPENAI_MODEL || "gpt-5.2",
  });

  await supabase
    .from("companies")
    .update({
      lead_score: result.score,
      lead_temperature: result.category,
      status: result.score >= 75 ? "qualified" : "researching",
    })
    .eq("id", companyId);

  return result satisfies LeadScoreShape;
}

async function createDemoForCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  company: {
    name: string;
    city: string | null;
    industry: string | null;
    website_url: string | null;
  },
  latestScore: { qrUseCase: string; recommendedPitch: string } | null,
) {
  const { data: existingDemo } = await supabase.from("qr_demos").select("id").eq("company_id", companyId).maybeSingle();

  if (existingDemo) {
    return existingDemo.id;
  }

  const demoId = randomUUID();
  const demoUrl = `/demo/${demoId}`;
  const landingConfig = buildDemoLandingConfig({
    companyName: company.name,
    city: company.city,
    industry: company.industry,
    websiteUrl: company.website_url,
    qrUseCase: latestScore?.qrUseCase ?? null,
    recommendedPitch: latestScore?.recommendedPitch ?? null,
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qrCodeUrl = await buildQrCodeDataUrl(`${appUrl}${demoUrl}`);

  await supabase.from("qr_demos").insert({
    id: demoId,
    company_id: companyId,
    title: landingConfig.headline,
    demo_url: demoUrl,
    qr_code_url: qrCodeUrl,
    use_case: latestScore?.qrUseCase ?? landingConfig.headline,
    landing_page_config: landingConfig,
  });

  return demoId;
}

async function createAutoDraftForHotLead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceOwnerId: string,
  companyId: string,
  company: {
    name: string;
    website_url: string | null;
    industry: string | null;
    city: string | null;
    country: string | null;
    description: string | null;
  },
  latestScore: LeadScoreShape,
) {
  if (latestScore.score < getHotLeadThreshold()) {
    return;
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, role, email, unsubscribed")
    .eq("company_id", companyId)
    .eq("unsubscribed", false)
    .not("email", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!contact?.email) {
    return;
  }

  const { data: suppressed } = await supabase.from("unsubscribe_list").select("id").eq("email", contact.email.toLowerCase()).maybeSingle();

  if (suppressed) {
    return;
  }

  const { data: existingDraft } = await supabase
    .from("email_drafts")
    .select("id")
    .eq("company_id", companyId)
    .eq("contact_id", contact.id)
    .in("status", ["needs_review", "approved"])
    .maybeSingle();

  if (existingDraft) {
    return;
  }

  const { data: demo } = await supabase.from("qr_demos").select("demo_url").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: template } = await supabase.from("email_templates").select("subject_template, body_template").order("created_at", { ascending: false }).limit(1).maybeSingle();

  const draft = await generateEmailDraft({
    company: {
      name: company.name,
      websiteUrl: company.website_url,
      industry: company.industry,
      city: company.city,
      country: company.country,
      description: company.description,
    },
    contact: {
      name: contact.name,
      role: contact.role,
      email: contact.email,
    },
    score: latestScore,
    demoUrl: demo?.demo_url ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${demo.demo_url}` : null,
    template: template
      ? {
          subjectTemplate: template.subject_template,
          bodyTemplate: template.body_template,
        }
      : null,
  });

  await supabase.from("email_drafts").insert({
    company_id: companyId,
    contact_id: contact.id,
    subject: draft.subject,
    body: draft.body,
    status: "needs_review",
    approved_by_user: false,
    created_by: workspaceOwnerId,
  });
}

function getHotLeadThreshold() {
  return Number(process.env.AUTOMATION_HOT_LEAD_SCORE || "75");
}

function getDailySendLimit() {
  return Number(process.env.DAILY_SEND_LIMIT || "25");
}

function getStartOfTodayIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function clearCompanies(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "CLEAR") {
    redirect("/dashboard?error=clear_confirmation_required");
  }

  await supabase.from("companies").delete().eq("created_by", workspace.workspaceOwnerId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/outreach");
  redirect("/dashboard?cleared=done");
}

export async function createCompany(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const websiteUrl = normalizeWebsiteUrl(String(formData.get("websiteUrl") ?? ""));
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "new").trim() || "new";

  if (!name) {
    redirect("/dashboard?error=company_name_required");
  }

  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.LEADS_IMPORTED);
    if (websiteUrl) {
      await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
    }
  } catch {
    redirectForUsageLimit(websiteUrl ? USAGE_METRICS.COMPANIES_ANALYZED : USAGE_METRICS.LEADS_IMPORTED, "/dashboard");
  }

  const duplicateQuery = websiteUrl
    ? supabase.from("companies").select("id").eq("created_by", workspace.workspaceOwnerId).eq("website_url", websiteUrl).maybeSingle()
    : supabase.from("companies").select("id").eq("created_by", workspace.workspaceOwnerId).eq("name", name).eq("city", city ?? "").maybeSingle();

  const { data: duplicate } = await duplicateQuery;

  if (duplicate) {
    redirect(`/dashboard/companies/${duplicate.id}?notice=duplicate`);
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name,
      website_url: websiteUrl,
      industry,
      city,
      country,
      description,
      status,
      created_by: workspace.workspaceOwnerId,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/dashboard?error=company_create_failed");
  }

  await ensureDefaultRoleTargets(supabase, data.id);
  await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.LEADS_IMPORTED);

  // AI enrichment: analyze the website if a URL was provided
  if (websiteUrl) {
    try {
      const analysis = await analyzeWebsiteForCompany(supabase, data.id, websiteUrl);
      await syncExtractedCompanyContactData(supabase, data.id, analysis);
      await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
    } catch {
      // Keep resilient — company is already saved
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/directory");
  redirect(`/dashboard/companies/${data.id}`);
}

export async function updateCompanyStatus(formData: FormData) {
  const { supabase } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const status = String(formData.get("status") ?? "new");

  await supabase.from("companies").update({ status }).eq("id", companyId);
  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function addContact(formData: FormData) {
  const { supabase } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  await upsertCompanyContact(supabase, companyId, {
    name: String(formData.get("name") ?? "").trim() || null,
    jobTitle: String(formData.get("jobTitle") ?? "").trim() || null,
    seniority: String(formData.get("seniority") ?? "").trim() || null,
    department: String(formData.get("department") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || null,
    contactType: String(formData.get("contactType") ?? "").trim() || null,
    sourceUrl: String(formData.get("sourceUrl") ?? "").trim() || null,
    consentBasis: String(formData.get("consentBasis") ?? "").trim() || null,
    sourceType: "manual",
    sourceConfidence: 100,
  });
  await syncPersonnelCoverage(supabase, companyId);

  revalidatePath(`/dashboard/companies/${companyId}`);
  revalidatePath("/dashboard/people");
}

export async function addCompanyNote(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return;
  }

  await supabase.from("company_notes").insert({
    company_id: companyId,
    body,
    created_by: workspace.workspaceOwnerId,
  });

  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function searchCompanies(formData: FormData) {
  const { supabase, user, workspace } = await requireUser();
  const niche = String(formData.get("niche") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!niche || !location) {
    redirect("/dashboard?error=search_fields_required");
  }

  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    redirect("/dashboard?error=missing_serpapi_key");
  }

  const query = `${niche} ${location}`;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", buildSearchQuery(niche, location));
  url.searchParams.set("num", "10");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    redirect("/dashboard?error=search_failed");
  }

  const payload = (await response.json()) as { organic_results?: SearchResult[] };
  const organicResults = payload.organic_results ?? [];
  const autoAutomationEnabled = process.env.ENABLE_AUTOMATION === "true";

  // Resolve country once for the entire location rather than per-result
  const locationCountry = await lookupCountryForLocation(location);
  let importedCount = 0;
  let analyzedCount = 0;
  let scoredCount = 0;
  let draftCount = 0;

  for (const result of organicResults) {
    const normalizedWebsite = normalizeWebsiteUrl(result.link);

    if (!normalizedWebsite) {
      continue;
    }

    if (isLikelyAggregatorSite(normalizedWebsite, result.title, result.snippet, niche)) {
      continue;
    }

    const hostname = new URL(normalizedWebsite).hostname;
    const companyName = extractCompanyName(result.title, hostname);
    const inferredCountry = locationCountry ?? inferCountryFromHostname(hostname);

    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id, country")
      .eq("created_by", workspace.workspaceOwnerId)
      .eq("website_url", normalizedWebsite)
      .maybeSingle();

    let companyId = existingCompany?.id;

    if (!companyId) {
      try {
        await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.LEADS_IMPORTED);
      } catch {
        break;
      }
      const { data: createdCompany } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          website_url: normalizedWebsite,
          industry: niche,
          city: location,
          country: inferredCountry,
          description: result.snippet ?? null,
          status: "new",
          created_by: workspace.workspaceOwnerId,
        })
        .select("id")
        .single();

      companyId = createdCompany?.id;
      if (companyId) {
        importedCount += 1;
      }
    } else if (existingCompany && inferredCountry && existingCompany.country !== inferredCountry) {
      await supabase.from("companies").update({ country: inferredCountry }).eq("id", companyId);
    }

    if (!companyId) {
      continue;
    }

    const { data: existingSource } = await supabase
      .from("lead_sources")
      .select("id")
      .eq("company_id", companyId)
      .eq("source_url", result.link)
      .maybeSingle();

    if (!existingSource) {
      await supabase.from("lead_sources").insert({
        company_id: companyId,
        source_url: result.link,
        source_type: "search_result",
        found_text: result.snippet ?? result.title,
      });
    }

    try {
      await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
      const analysis = await analyzeWebsiteForCompany(supabase, companyId, normalizedWebsite);
      await syncExtractedCompanyContactData(supabase, companyId, analysis);
      analyzedCount += 1;
    } catch {
      // Keep search resilient if a website blocks scraping or has no clear contact details.
    }

    if (!autoAutomationEnabled || !companyId) {
      continue;
    }

    try {
      const { data: company } = await supabase
        .from("companies")
        .select("name, website_url, industry, city, country, description")
        .eq("id", companyId)
        .maybeSingle();

      if (!company?.website_url) {
        continue;
      }

      try {
        await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.AI_SCORES_GENERATED);
      } catch {
        continue;
      }

      const score = await scoreCompanyLead(supabase, companyId, company);
      scoredCount += 1;

      if (score.score >= getHotLeadThreshold()) {
        await createDemoForCompany(
          supabase,
          companyId,
          {
            name: company.name,
            city: company.city,
            industry: company.industry,
            website_url: company.website_url,
          },
          {
            qrUseCase: score.qrUseCase,
            recommendedPitch: score.recommendedPitch,
          },
        );

        try {
          await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.OUTREACH_DRAFTS_GENERATED);
        } catch {
          continue;
        }
        await createAutoDraftForHotLead(supabase, workspace.workspaceOwnerId, companyId, company, score);
        draftCount += 1;
      }
    } catch {
      // Keep search resilient if automation fails for one lead.
    }
  }

  if (importedCount > 0) {
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.LEADS_IMPORTED, importedCount);
  }
  if (analyzedCount > 0) {
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED, analyzedCount);
  }
  if (scoredCount > 0) {
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.AI_SCORES_GENERATED, scoredCount);
  }
  if (draftCount > 0) {
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.OUTREACH_DRAFTS_GENERATED, draftCount);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?search=${encodeURIComponent(query)}`);
}

export async function analyzeLeadWebsite(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const { data: company } = await supabase.from("companies").select("website_url").eq("id", companyId).maybeSingle();

  if (!company?.website_url) {
    redirect(`/dashboard/companies/${companyId}?error=missing_website`);
  }

  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
    const analysis = await analyzeWebsiteForCompany(supabase, companyId, company.website_url);
    await syncExtractedCompanyContactData(supabase, companyId, analysis);
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
  } catch (error) {
    if (error instanceof Error && error.name === "UsageLimitError") {
      redirectForUsageLimit(USAGE_METRICS.COMPANIES_ANALYZED, `/dashboard/companies/${companyId}`);
    }
    redirect(`/dashboard/companies/${companyId}?error=analysis_failed`);
  }

  revalidatePath(`/dashboard/companies/${companyId}`);
  redirect(`/dashboard/companies/${companyId}?analysis=done`);
}

export async function scoreLead(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const [{ data: company }, { data: evidence }] = await Promise.all([
    supabase.from("companies").select("name, website_url, industry, city, country, description").eq("id", companyId).maybeSingle(),
    supabase.from("lead_sources").select("source_type, source_url, found_text").eq("company_id", companyId).order("created_at", { ascending: false }),
  ]);

  if (!company) {
    redirect("/dashboard?error=company_create_failed");
  }

  if ((evidence ?? []).length === 0) {
    redirect(`/dashboard/companies/${companyId}?error=missing_evidence`);
  }

  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.AI_SCORES_GENERATED);
    await scoreCompanyLead(supabase, companyId, company);
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.AI_SCORES_GENERATED);
  } catch (error) {
    if (error instanceof Error && error.name === "UsageLimitError") {
      redirectForUsageLimit(USAGE_METRICS.AI_SCORES_GENERATED, `/dashboard/companies/${companyId}`);
    }
    redirect(`/dashboard/companies/${companyId}?error=scoring_failed`);
  }

  revalidatePath(`/dashboard/companies/${companyId}`);
  redirect(`/dashboard/companies/${companyId}?score=done`);
}

export async function generateDemo(formData: FormData) {
  const { supabase } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const [{ data: company }, { data: latestScore }] = await Promise.all([
    supabase.from("companies").select("name, city, industry, website_url").eq("id", companyId).maybeSingle(),
    supabase
      .from("lead_scores")
      .select("qr_use_case, recommended_pitch")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!company) {
    redirect("/dashboard?error=company_create_failed");
  }

  await createDemoForCompany(
    supabase,
    companyId,
    company,
    latestScore
      ? {
          qrUseCase: latestScore.qr_use_case ?? "",
          recommendedPitch: latestScore.recommended_pitch ?? "",
        }
      : null,
  );

  revalidatePath(`/dashboard/companies/${companyId}`);
  redirect(`/dashboard/companies/${companyId}?demo=done`);
}

export async function createEmailTemplate(formData: FormData) {
  const { supabase, workspace } = await requireUser();

  await supabase.from("email_templates").insert({
    name: String(formData.get("name") ?? "").trim() || "Default template",
    subject_template: String(formData.get("subjectTemplate") ?? "").trim() || null,
    body_template: String(formData.get("bodyTemplate") ?? "").trim() || null,
    niche: String(formData.get("niche") ?? "").trim() || null,
    created_by: workspace.workspaceOwnerId,
  });

  revalidatePath("/dashboard/outreach");
}

export async function createCampaign(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect("/dashboard/outreach?error=campaign_name_required");
  }

  await supabase.from("campaigns").insert({
    name,
    niche: String(formData.get("niche") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    status: String(formData.get("status") ?? "").trim() || "draft",
    created_by: workspace.workspaceOwnerId,
  });

  revalidatePath("/dashboard/outreach");
}

export async function addCompanyToCampaign(formData: FormData) {
  const { supabase } = await requireUser();
  const campaignId = String(formData.get("campaignId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");

  if (!campaignId || !companyId) {
    return;
  }

  const { data: existing } = await supabase
    .from("campaign_leads")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("campaign_leads").insert({
      campaign_id: campaignId,
      company_id: companyId,
      status: "new",
    });
  }

  revalidatePath(`/dashboard/companies/${companyId}`);
  revalidatePath("/dashboard/outreach");
}

export async function generateLeadDraft(formData: FormData) {
  const { supabase, user, workspace } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "") || null;
  const templateId = String(formData.get("templateId") ?? "") || null;

  const [{ data: company }, { data: contact }, { data: score }, { data: demo }, { data: template }] = await Promise.all([
    supabase.from("companies").select("name, website_url, industry, city, country, description").eq("id", companyId).maybeSingle(),
    supabase.from("contacts").select("id, name, role, email").eq("id", contactId).maybeSingle(),
    supabase
      .from("lead_scores")
      .select("category, qr_use_case, reason, recommended_pitch")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("qr_demos").select("demo_url").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    templateId ? supabase.from("email_templates").select("subject_template, body_template").eq("id", templateId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  if (!company || !contact?.email) {
    redirect(`/dashboard/companies/${companyId}?error=missing_contact_email`);
  }

  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.OUTREACH_DRAFTS_GENERATED);
  } catch {
    redirectForUsageLimit(USAGE_METRICS.OUTREACH_DRAFTS_GENERATED, `/dashboard/companies/${companyId}`);
  }

  let draft;

  try {
    draft = await generateEmailDraft({
      company: {
        name: company.name,
        websiteUrl: company.website_url,
        industry: company.industry,
        city: company.city,
        country: company.country,
        description: company.description,
      },
      contact: {
        name: contact.name,
        role: contact.role,
        email: contact.email,
      },
      score: score
        ? {
            category: score.category,
            qrUseCase: score.qr_use_case,
            reason: score.reason,
            recommendedPitch: score.recommended_pitch,
          }
        : null,
      demoUrl: demo?.demo_url ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${demo.demo_url}` : null,
      template: template
        ? {
            subjectTemplate: template.subject_template,
            bodyTemplate: template.body_template,
          }
        : null,
    });
  } catch {
    redirect(`/dashboard/companies/${companyId}?error=draft_failed`);
  }

  const { data: createdDraft } = await supabase
    .from("email_drafts")
    .select("id")
    .eq("company_id", companyId)
    .eq("contact_id", contact.id)
    .in("status", ["needs_review", "approved"])
    .maybeSingle();

  if (createdDraft?.id) {
    redirect(`/dashboard/outreach/drafts/${createdDraft.id}`);
  }

  const { data: newDraft } = await supabase
    .from("email_drafts")
    .insert({
      company_id: companyId,
      contact_id: contact.id,
      campaign_id: campaignId,
      subject: draft.subject,
      body: draft.body,
      status: "needs_review",
      approved_by_user: false,
      created_by: workspace.workspaceOwnerId,
    })
    .select("id")
    .single();

  await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.OUTREACH_DRAFTS_GENERATED);

  revalidatePath(`/dashboard/companies/${companyId}`);
  revalidatePath("/dashboard/outreach");
  redirect(`/dashboard/outreach/drafts/${newDraft?.id}`);
}

export async function updateDraft(formData: FormData) {
  const { supabase } = await requireUser();
  const draftId = String(formData.get("draftId") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  await supabase
    .from("email_drafts")
    .update({
      subject,
      body,
      status: "needs_review",
      approved_by_user: false,
    })
    .eq("id", draftId);

  revalidatePath(`/dashboard/outreach/drafts/${draftId}`);
  revalidatePath("/dashboard/outreach");
}

export async function approveDraft(formData: FormData) {
  const { supabase } = await requireUser();
  const draftId = String(formData.get("draftId") ?? "");

  await supabase
    .from("email_drafts")
    .update({
      status: "approved",
      approved_by_user: true,
    })
    .eq("id", draftId);

  revalidatePath(`/dashboard/outreach/drafts/${draftId}`);
  revalidatePath("/dashboard/outreach");
}

export async function sendApprovedDraft(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const draftId = String(formData.get("draftId") ?? "");
  const [{ data: draft }, { data: contactIdRow }] = await Promise.all([
    supabase.from("email_drafts").select("*").eq("id", draftId).maybeSingle(),
    supabase.from("email_drafts").select("contact_id").eq("id", draftId).maybeSingle(),
  ]);

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email, unsubscribed")
    .eq("id", contactIdRow?.contact_id ?? "")
    .maybeSingle();

  if (!draft || !draft.approved_by_user || draft.status !== "approved") {
    redirect(`/dashboard/outreach/drafts/${draftId}?error=draft_not_approved`);
  }

  if (!contact?.email || contact.unsubscribed) {
    redirect(`/dashboard/outreach/drafts/${draftId}?error=contact_unsubscribed`);
  }

  const { data: suppressed } = await supabase.from("unsubscribe_list").select("id").eq("email", contact.email.toLowerCase()).maybeSingle();

  if (suppressed) {
    redirect(`/dashboard/outreach/drafts/${draftId}?error=contact_unsubscribed`);
  }

  const { count: sendsToday } = await supabase
    .from("email_sends")
    .select("*", { count: "exact", head: true })
    .gte("sent_at", getStartOfTodayIso());

  if ((sendsToday ?? 0) >= getDailySendLimit()) {
    redirect(`/dashboard/outreach/drafts/${draftId}?error=daily_limit_reached`);
  }

  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.EMAILS_SENT);
  } catch {
    redirectForUsageLimit(USAGE_METRICS.EMAILS_SENT, `/dashboard/outreach/drafts/${draftId}`);
  }

  const { data: existingSend } = await supabase.from("email_sends").select("id").eq("draft_id", draft.id).maybeSingle();

  if (existingSend) {
    redirect(`/dashboard/outreach/drafts/${draftId}?error=already_sent`);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendKey || !fromEmail) {
    redirect(`/dashboard/outreach/drafts/${draftId}?error=missing_resend`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(contact.email)}&company=${encodeURIComponent(draft.company_id)}`;
  const resend = new Resend(resendKey);
  const sendResult = await resend.emails.send({
    from: fromEmail,
    to: contact.email,
    subject: draft.subject || "Stirling QR idea",
    text: `${draft.body || ""}\n\nUnsubscribe: ${unsubscribeUrl}`,
  });

  if (sendResult.error) {
    redirect(`/dashboard/outreach/drafts/${draftId}?error=send_failed`);
  }

  await supabase.from("email_sends").insert({
    draft_id: draft.id,
    company_id: draft.company_id,
    contact_id: draft.contact_id,
    campaign_id: draft.campaign_id,
    provider_message_id: sendResult.data?.id || null,
    sent_at: new Date().toISOString(),
  });

  await supabase
    .from("email_drafts")
    .update({
      status: "sent",
    })
    .eq("id", draft.id);

  await supabase
    .from("companies")
    .update({
      status: "contacted",
    })
    .eq("id", draft.company_id);

  await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.EMAILS_SENT);

  revalidatePath(`/dashboard/outreach/drafts/${draftId}`);
  revalidatePath(`/dashboard/companies/${draft.company_id}`);
  revalidatePath("/dashboard/outreach");
  redirect(`/dashboard/outreach/drafts/${draftId}?sent=done`);
}

export async function markSendEvent(formData: FormData) {
  const { supabase } = await requireUser();
  const emailSendId = String(formData.get("emailSendId") ?? "");
  const event = String(formData.get("event") ?? "");

  const fieldMap: Record<string, string> = {
    opened: "opened_at",
    clicked: "clicked_at",
    replied: "replied_at",
    bounced: "bounced_at",
  };

  const field = fieldMap[event];

  if (!field) {
    return;
  }

  await supabase.from("email_sends").update({ [field]: new Date().toISOString() }).eq("id", emailSendId);
  revalidatePath("/dashboard/outreach");
}

export async function addSearchResult(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const websiteUrl = normalizeWebsiteUrl(String(formData.get("websiteUrl") ?? ""));
  const snippet = String(formData.get("snippet") ?? "").trim() || null;
  const niche = String(formData.get("niche") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;

  if (!name || !websiteUrl) {
    redirect("/dashboard/search?error=missing_fields");
  }

  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.LEADS_IMPORTED);
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
  } catch {
    redirectForUsageLimit(USAGE_METRICS.LEADS_IMPORTED, "/dashboard/search");
  }

  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("created_by", workspace.workspaceOwnerId)
    .eq("website_url", websiteUrl)
    .maybeSingle();

  if (existing) {
    redirect(`/dashboard/search?added=${existing.id}`);
  }

  const { data: created } = await supabase
    .from("companies")
    .insert({
      name,
      website_url: websiteUrl,
      industry: niche,
      city: location,
      country,
      description: snippet,
      status: "new",
      created_by: workspace.workspaceOwnerId,
    })
    .select("id")
    .single();

  if (!created) {
    redirect("/dashboard/search?error=save_failed");
  }

  const companyId = created.id;

  // Store the search result as a lead source
  await supabase.from("lead_sources").insert({
    company_id: companyId,
    source_url: websiteUrl,
    source_type: "search_result",
    found_text: snippet ?? name,
  });

  // AI enrichment: analyze website to extract email, contact details, address
  try {
    const analysis = await analyzeWebsiteForCompany(supabase, companyId, websiteUrl);
    await syncExtractedCompanyContactData(supabase, companyId, analysis);
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
  } catch {
    // Keep resilient — company is saved even if AI enrichment fails
  }

  await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.LEADS_IMPORTED);

  revalidatePath("/dashboard/directory");
  redirect(`/dashboard/search?added=${companyId}`);
}

export async function deleteCompany(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");

  if (!companyId) return;

  await supabase.from("companies").delete().eq("id", companyId).eq("created_by", workspace.workspaceOwnerId);

  revalidatePath("/dashboard/directory");
  revalidatePath("/dashboard");
  redirect("/dashboard/directory");
}

export async function addMultipleSearchResults(formData: FormData) {
  const { supabase, workspace } = await requireUser();

  let selections: Array<{
    name: string;
    websiteUrl: string;
    snippet: string;
    niche: string;
    location: string;
    country: string;
  }>;

  try {
    selections = JSON.parse(String(formData.get("selections") ?? "[]"));
  } catch {
    redirect("/dashboard/search?error=invalid_selections");
  }

  if (!Array.isArray(selections) || selections.length === 0) {
    redirect("/dashboard/directory");
  }

  const enrichQueue: Array<{ companyId: string; websiteUrl: string }> = [];
  let importedCount = 0;

  for (const sel of selections) {
    const websiteUrl = normalizeWebsiteUrl(sel.websiteUrl);
    if (!websiteUrl) continue;

    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("created_by", workspace.workspaceOwnerId)
      .eq("website_url", websiteUrl)
      .maybeSingle();

    if (existing) continue;

    try {
      await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.LEADS_IMPORTED);
      await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
    } catch {
      break;
    }

    const { data: created } = await supabase
      .from("companies")
      .insert({
        name: sel.name,
        website_url: websiteUrl,
        industry: sel.niche || null,
        city: sel.location || null,
        country: sel.country || null,
        description: sel.snippet || null,
        status: "new",
        created_by: workspace.workspaceOwnerId,
      })
      .select("id")
      .single();

    if (!created) continue;

    await supabase.from("lead_sources").insert({
      company_id: created.id,
      source_url: websiteUrl,
      source_type: "search_result",
      found_text: sel.snippet || sel.name,
    });

    enrichQueue.push({ companyId: created.id, websiteUrl });
    importedCount += 1;
  }

  // Run website analyses in parallel so email/contact data is ready when directory loads
  const enrichResults = await Promise.allSettled(
    enrichQueue.map(({ companyId, websiteUrl }) =>
      analyzeWebsiteForCompany(supabase, companyId, websiteUrl)
        .then((analysis) => syncExtractedCompanyContactData(supabase, companyId, analysis))
        .catch(() => undefined)
    )
  );

  const analyzedCount = enrichResults.filter((result) => result.status === "fulfilled").length;

  if (importedCount > 0) {
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.LEADS_IMPORTED, importedCount);
  }
  if (analyzedCount > 0) {
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED, analyzedCount);
  }

  revalidatePath("/dashboard/directory");
  redirect("/dashboard/directory");
}

export async function updateContact(formData: FormData) {
  const { supabase } = await requireUser();
  const contactId = String(formData.get("contactId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;
  const jobTitle = String(formData.get("jobTitle") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const seniority = String(formData.get("seniority") ?? "").trim() || null;
  const department = String(formData.get("department") ?? "").trim() || null;
  const linkedinUrl = normalizeLinkedInUrl(String(formData.get("linkedinUrl") ?? "").trim());
  const contactType = String(formData.get("contactType") ?? "").trim() || null;
  const consentBasis = String(formData.get("consentBasis") ?? "").trim() || null;
  const roleNormalized = normalizeRole(jobTitle);

  if (!contactId) return;

  await supabase
    .from("contacts")
    .update({
      name,
      role: jobTitle,
      job_title: jobTitle,
      seniority,
      department,
      email,
      work_email: email,
      phone,
      direct_phone: phone,
      linkedin_url: linkedinUrl,
      linkedin_slug: extractLinkedInSlug(linkedinUrl),
      contact_type: contactType,
      consent_basis: consentBasis,
      role_normalized: roleNormalized,
      is_decision_maker: isDecisionMaker(jobTitle, roleNormalized),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  await syncPersonnelCoverage(supabase, companyId);

  revalidatePath(`/dashboard/companies/${companyId}`);
  revalidatePath("/dashboard/directory");
  revalidatePath("/dashboard/people");
}

export async function createPersonList(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return;

  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.SAVED_LISTS_CREATED);
  } catch {
    redirectForUsageLimit(USAGE_METRICS.SAVED_LISTS_CREATED, "/dashboard/lists");
  }

  const { data } = await supabase
    .from("person_lists")
    .insert({ name, description, created_by: workspace.workspaceOwnerId })
    .select("id")
    .single();

  await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.SAVED_LISTS_CREATED);

  revalidatePath("/dashboard/lists");
  if (data) redirect(`/dashboard/lists/${data.id}`);
}

export async function savePersonSearchAsList(formData: FormData) {
  const { supabase, user, workspace } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const filtersRaw = String(formData.get("filters") ?? "{}");
  const contactIdsRaw = String(formData.get("contactIds") ?? "[]");

  if (!name) return;

  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.SAVED_LISTS_CREATED);
  } catch {
    redirectForUsageLimit(USAGE_METRICS.SAVED_LISTS_CREATED, "/dashboard/people");
  }

  let filters: Record<string, string> = {};
  let contactIds: string[] = [];

  try {
    filters = JSON.parse(filtersRaw) as Record<string, string>;
  } catch {
    filters = {};
  }

  try {
    contactIds = JSON.parse(contactIdsRaw) as string[];
  } catch {
    contactIds = [];
  }

  const { data: list } = await supabase
    .from("person_lists")
    .insert({ name, description, created_by: workspace.workspaceOwnerId })
    .select("id")
    .single();

  if (!list) return;

  await supabase.from("person_search_runs").insert({
    created_by: workspace.workspaceOwnerId,
    query_label: name,
    filters,
    status: "completed",
    result_count: contactIds.length,
    completed_at: new Date().toISOString(),
  });

  if (contactIds.length > 0) {
    await supabase.from("person_list_members").upsert(
      contactIds.map((contactId) => ({ list_id: list.id, contact_id: contactId })),
      { onConflict: "list_id,contact_id", ignoreDuplicates: true },
    );
  }

  await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.SAVED_LISTS_CREATED);

  revalidatePath("/dashboard/people");
  revalidatePath("/dashboard/lists");
  redirect(`/dashboard/lists/${list.id}`);
}

export async function addToPersonList(formData: FormData) {
  const { supabase } = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");

  if (!listId || !contactId) return;

  await supabase.from("person_list_members").upsert({ list_id: listId, contact_id: contactId });

  revalidatePath(`/dashboard/lists/${listId}`);
  revalidatePath(`/dashboard/people/${contactId}`);
}

export async function removeFromPersonList(formData: FormData) {
  const { supabase } = await requireUser();
  const listId = String(formData.get("listId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");

  if (!listId || !contactId) return;

  await supabase.from("person_list_members").delete().eq("list_id", listId).eq("contact_id", contactId);

  revalidatePath(`/dashboard/lists/${listId}`);
}

export async function deletePersonList(formData: FormData) {
  const { supabase } = await requireUser();
  const listId = String(formData.get("listId") ?? "");

  if (!listId) return;

  await supabase.from("person_lists").delete().eq("id", listId);

  revalidatePath("/dashboard/lists");
  redirect("/dashboard/lists");
}

export async function scrapePersonnel(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, website_url")
    .eq("id", companyId)
    .maybeSingle();

  if (!company?.website_url) {
    redirect(`/dashboard/companies/${companyId}?error=missing_website`);
  }

  let result;
  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
    result = await scrapePersonnelFromWebsite(company.website_url);
  } catch (error) {
    if (error instanceof Error && error.name === "UsageLimitError") {
      redirectForUsageLimit(USAGE_METRICS.COMPANIES_ANALYZED, `/dashboard/companies/${companyId}`);
    }
    redirect(`/dashboard/companies/${companyId}?error=scrape_failed`);
  }

  const { people, pagesChecked } = result;
  let insertedCount = 0;

  for (const person of people) {
    const { id: contactId, inserted } = await upsertCompanyContact(supabase, companyId, {
      name: person.name,
      jobTitle: person.jobTitle,
      email: person.email,
      linkedinUrl: person.linkedinUrl,
      sourceUrl: person.sourceUrl,
      consentBasis: "public website",
      sourceType: "website_scrape",
      sourceConfidence: 70,
      enrichmentStatus: "scraped",
    });

    if (inserted) insertedCount++;

    if (contactId) {
      await supabase.from("contact_sources").insert({
        contact_id: contactId,
        company_id: companyId,
        source_kind: "website_team_page",
        source_url: person.sourceUrl,
        evidence_text: person.evidenceText,
      });
    }
  }
  await syncPersonnelCoverage(supabase, companyId);
  await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);

  revalidatePath(`/dashboard/companies/${companyId}`);
  revalidatePath("/dashboard/people");

  const count = insertedCount;
  const pages = pagesChecked.length;
  redirect(`/dashboard/companies/${companyId}?scraped=${count}&pages=${pages}`);
}

export async function refreshCompanyNow(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");

  try {
    await assertUsageWithinLimit(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
    const result = await refreshCompany(supabase, companyId);
    await incrementUsage(supabase, workspace.workspaceOwnerId, USAGE_METRICS.COMPANIES_ANALYZED);
    revalidatePath(`/dashboard/companies/${companyId}`);
    revalidatePath("/dashboard/updates");
    revalidatePath("/dashboard/directory");
    redirect(`/dashboard/companies/${companyId}?refreshed=${result.newPeopleFound}`);
  } catch (error) {
    if (error instanceof Error && error.name === "UsageLimitError") {
      redirectForUsageLimit(USAGE_METRICS.COMPANIES_ANALYZED, `/dashboard/companies/${companyId}`);
    }
    redirect(`/dashboard/companies/${companyId}?error=refresh_failed`);
  }
}

export async function pushCompanyToCrm(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const provider = String(formData.get("provider") ?? "hubspot");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) redirect(`/dashboard/companies/${companyId}?error=not_found`);

  let objectId: string | undefined;
  let errorMessage: string | undefined;
  const connection = await getCrmConnection(supabase, workspace.workspaceOwnerId, provider);

  if (provider === "hubspot") {
    const result = await pushCompanyToHubSpot({
      name: company.name,
      domain: company.website_url,
      industry: company.industry,
      city: company.city,
      country: company.country,
      description: company.description,
    }, {
      accessToken: connection?.access_token ?? null,
    });
    objectId = result.objectId;
    errorMessage = result.error;
  }

  if (connection) {
    await supabase.from("crm_sync_jobs").insert({
      crm_connection_id: connection.id,
      company_id: companyId,
      direction: "outbound",
      provider_object_type: "company",
      provider_object_id: objectId ?? null,
      status: errorMessage ? "failed" : "completed",
      error_message: errorMessage ?? null,
      completed_at: new Date().toISOString(),
    });
  }

  revalidatePath(`/dashboard/companies/${companyId}`);
  revalidatePath("/dashboard/integrations");
  redirect(`/dashboard/companies/${companyId}?crm=${errorMessage ? "error" : "synced"}`);
}

export async function pushContactToCrm(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const contactId = String(formData.get("contactId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const provider = String(formData.get("provider") ?? "hubspot");

  const { data: contact } = await supabase
    .from("contacts")
    .select("*, companies(name)")
    .eq("id", contactId)
    .maybeSingle();

  if (!contact) return;

  const companyName = Array.isArray(contact.companies)
    ? contact.companies[0]?.name
    : (contact.companies as { name: string } | null)?.name;

  let objectId: string | undefined;
  let errorMessage: string | undefined;
  const connection = await getCrmConnection(supabase, workspace.workspaceOwnerId, provider);

  if (provider === "hubspot") {
    const result = await pushContactToHubSpot({
      fullName: contact.name,
      email: contact.work_email || contact.email,
      phone: contact.direct_phone || contact.phone,
      jobTitle: contact.job_title || contact.role,
      linkedinUrl: contact.linkedin_url,
      companyName: companyName ?? undefined,
    }, {
      accessToken: connection?.access_token ?? null,
    });
    objectId = result.objectId;
    errorMessage = result.error;
  }

  if (connection) {
    await supabase.from("crm_sync_jobs").insert({
      crm_connection_id: connection.id,
      contact_id: contactId,
      company_id: companyId || null,
      direction: "outbound",
      provider_object_type: "contact",
      provider_object_id: objectId ?? null,
      status: errorMessage ? "failed" : "completed",
      error_message: errorMessage ?? null,
      completed_at: new Date().toISOString(),
    });
  }

  revalidatePath(`/dashboard/people/${contactId}`);
  revalidatePath("/dashboard/integrations");
  redirect(`/dashboard/people/${contactId}?crm=${errorMessage ? "error" : "synced"}`);
}

export async function saveCrmConnection(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const provider = String(formData.get("provider") ?? "");
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const accountLabel = String(formData.get("accountLabel") ?? "").trim() || null;

  if (!provider || !apiKey) redirect("/dashboard/integrations?error=missing_fields");

  const { data: existing } = await supabase
    .from("crm_connections")
    .select("id")
    .eq("created_by", workspace.workspaceOwnerId)
    .eq("provider", provider)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("crm_connections")
      .update({ access_token: apiKey, account_label: accountLabel, status: "active", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("crm_connections").insert({
      created_by: workspace.workspaceOwnerId,
      provider,
      account_label: accountLabel,
      access_token: apiKey,
      status: "active",
    });
  }

  revalidatePath("/dashboard/integrations");
  redirect("/dashboard/integrations?connected=done");
}

export async function disconnectCrm(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const connectionId = String(formData.get("connectionId") ?? "");

  await supabase.from("crm_connections").delete().eq("id", connectionId).eq("created_by", workspace.workspaceOwnerId);

  revalidatePath("/dashboard/integrations");
  redirect("/dashboard/integrations?disconnected=done");
}

export async function inviteWorkspaceMember(formData: FormData) {
  const { supabase, user, workspace } = await requireUser();
  const inviteEmail = String(formData.get("inviteEmail") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member").trim() || "member";

  if (!workspace.isWorkspaceOwner) {
    redirect("/dashboard/team?error=owner_only");
  }

  if (!inviteEmail) {
    redirect("/dashboard/team?error=invite_email_required");
  }

  const seatSummary = await getSeatSummary(supabase, workspace.workspaceOwnerId);
  if (seatSummary.isFull) {
    redirect(buildSeatLimitRedirect("/dashboard/team"));
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", inviteEmail)
    .maybeSingle();

  await supabase.from("workspace_members").upsert(
    {
      workspace_owner_id: workspace.workspaceOwnerId,
      member_user_id: existingUser?.id ?? null,
      invite_email: inviteEmail,
      role,
      status: existingUser?.id ? "active" : "pending",
      invited_by: user.id,
      accepted_at: existingUser?.id ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_owner_id,invite_email" },
  );

  if (existingUser?.id) {
    await supabase
      .from("users")
      .update({
        workspace_owner_id: workspace.workspaceOwnerId,
        workspace_role: role,
      })
      .eq("id", existingUser.id);
  }

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/billing");
  redirect("/dashboard/team?invited=done");
}

export async function acceptWorkspaceInvite(formData: FormData) {
  const { supabase, user } = await requireUser();
  const membershipId = String(formData.get("membershipId") ?? "");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id, workspace_owner_id, invite_email, role, status")
    .eq("id", membershipId)
    .maybeSingle();

  if (!membership || membership.status === "active") {
    redirect("/dashboard/team?error=invite_not_found");
  }

  const { data: profile } = await supabase.from("users").select("email").eq("id", user.id).maybeSingle();
  if (!profile?.email || profile.email.toLowerCase() !== membership.invite_email.toLowerCase()) {
    redirect("/dashboard/team?error=invite_email_mismatch");
  }

  const seatSummary = await getSeatSummary(supabase, membership.workspace_owner_id);
  if (seatSummary.isFull) {
    redirect(buildSeatLimitRedirect("/dashboard/team"));
  }

  await supabase
    .from("workspace_members")
    .update({
      member_user_id: user.id,
      status: "active",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.id);

  await supabase
    .from("users")
    .update({
      workspace_owner_id: membership.workspace_owner_id,
      workspace_role: membership.role,
    })
    .eq("id", user.id);

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard");
  redirect("/dashboard/team?accepted=done");
}

export async function revokeWorkspaceMember(formData: FormData) {
  const { supabase, workspace } = await requireUser();
  const membershipId = String(formData.get("membershipId") ?? "");

  if (!workspace.isWorkspaceOwner) {
    redirect("/dashboard/team?error=owner_only");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id, member_user_id")
    .eq("id", membershipId)
    .eq("workspace_owner_id", workspace.workspaceOwnerId)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard/team?error=member_not_found");
  }

  if (membership.member_user_id) {
    await supabase
      .from("users")
      .update({
        workspace_owner_id: membership.member_user_id,
        workspace_role: "owner",
      })
      .eq("id", membership.member_user_id);
  }

  await supabase.from("workspace_members").delete().eq("id", membershipId);

  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/billing");
  redirect("/dashboard/team?removed=done");
}

export async function submitSupportRequest(formData: FormData) {
  const { supabase, user, workspace } = await requireUser();
  const requestType = String(formData.get("requestType") ?? "general").trim() || "general";
  const name = String(formData.get("name") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const companyName = String(formData.get("companyName") ?? "").trim() || null;
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!subject || !message) {
    redirect("/dashboard/contact?error=missing_fields");
  }

  await supabase.from("support_requests").insert({
    created_by: user.id,
    workspace_owner_id: workspace.workspaceOwnerId,
    request_type: requestType,
    name,
    email,
    company_name: companyName,
    subject,
    message,
  });

  revalidatePath("/dashboard/contact");
  redirect("/dashboard/contact?sent=done");
}

export async function markRoleTargetCovered(formData: FormData) {
  const { supabase } = await requireUser();
  const targetId = String(formData.get("targetId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");

  if (!targetId || !companyId) return;

  await supabase
    .from("company_role_targets")
    .update({
      status: "covered",
      primary_contact_id: null,
      notes: "Marked covered manually",
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId);

  await syncPersonnelCoverage(supabase, companyId);

  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function mergeDuplicateContact(formData: FormData) {
  const { supabase } = await requireUser();
  const keepId = String(formData.get("keepId") ?? "");
  const mergeId = String(formData.get("mergeId") ?? "");

  if (!keepId || !mergeId || keepId === mergeId) return;

  const [{ data: keep }, { data: merge }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", keepId).maybeSingle(),
    supabase.from("contacts").select("*").eq("id", mergeId).maybeSingle(),
  ]);

  if (!keep || !merge) return;

  const mergedPatch = {
    name: keep.name ?? merge.name,
    role: keep.role ?? merge.role,
    job_title: keep.job_title ?? merge.job_title,
    role_normalized: keep.role_normalized ?? merge.role_normalized,
    seniority: keep.seniority ?? merge.seniority,
    department: keep.department ?? merge.department,
    email: keep.email ?? merge.email,
    work_email: keep.work_email ?? merge.work_email,
    phone: keep.phone ?? merge.phone,
    direct_phone: keep.direct_phone ?? merge.direct_phone,
    linkedin_url: keep.linkedin_url ?? merge.linkedin_url,
    linkedin_slug: keep.linkedin_slug ?? merge.linkedin_slug,
    source_url: keep.source_url ?? merge.source_url,
    source_type: keep.source_type ?? merge.source_type,
    source_confidence: Math.max(keep.source_confidence ?? 0, merge.source_confidence ?? 0),
    consent_basis: keep.consent_basis ?? merge.consent_basis,
    is_decision_maker: Boolean(keep.is_decision_maker || merge.is_decision_maker),
    has_recent_changes: Boolean(keep.has_recent_changes || merge.has_recent_changes),
    updated_at: new Date().toISOString(),
  };

  await supabase.from("contacts").update(mergedPatch).eq("id", keepId);

  const { data: mergeMemberships } = await supabase
    .from("person_list_members")
    .select("list_id")
    .eq("contact_id", mergeId);

  if ((mergeMemberships ?? []).length > 0) {
    await supabase.from("person_list_members").upsert(
      (mergeMemberships ?? []).map((membership) => ({ list_id: membership.list_id, contact_id: keepId })),
      { onConflict: "list_id,contact_id", ignoreDuplicates: true },
    );
    await supabase.from("person_list_members").delete().eq("contact_id", mergeId);
  }

  await Promise.all([
    supabase.from("contact_sources").update({ contact_id: keepId }).eq("contact_id", mergeId),
    supabase.from("directory_change_events").update({ contact_id: keepId }).eq("contact_id", mergeId),
    supabase.from("crm_sync_jobs").update({ contact_id: keepId }).eq("contact_id", mergeId),
    supabase.from("company_role_targets").update({ primary_contact_id: keepId }).eq("primary_contact_id", mergeId),
  ]);

  await supabase.from("contacts").delete().eq("id", mergeId);

  await syncPersonnelCoverage(supabase, keep.company_id);

  revalidatePath("/dashboard/people");
  redirect("/dashboard/people?merged=done");
}
