"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { analyzeCompanyWebsite } from "@/lib/company-analysis";
import { buildDemoLandingConfig, buildQrCodeDataUrl } from "@/lib/demo";
import { generateEmailDraft } from "@/lib/email-draft";
import { extractCompanyName, normalizeWebsiteUrl } from "@/lib/leads";
import { scoreLeadWithAI } from "@/lib/lead-score";
import { createClient } from "@/lib/supabase/server";
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

  return { supabase, user };
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
  userId: string,
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
    created_by: userId,
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

export async function createCompany(formData: FormData) {
  const { supabase, user } = await requireUser();
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

  const duplicateQuery = websiteUrl
    ? supabase.from("companies").select("id").eq("created_by", user.id).eq("website_url", websiteUrl).maybeSingle()
    : supabase.from("companies").select("id").eq("created_by", user.id).eq("name", name).eq("city", city ?? "").maybeSingle();

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
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/dashboard?error=company_create_failed");
  }

  revalidatePath("/dashboard");
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

  await supabase.from("contacts").insert({
    company_id: companyId,
    name: String(formData.get("name") ?? "").trim() || null,
    role: String(formData.get("role") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    contact_type: String(formData.get("contactType") ?? "").trim() || null,
    source_url: String(formData.get("sourceUrl") ?? "").trim() || null,
    consent_basis: String(formData.get("consentBasis") ?? "").trim() || null,
  });

  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function addCompanyNote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return;
  }

  await supabase.from("company_notes").insert({
    company_id: companyId,
    body,
    created_by: user.id,
  });

  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function searchCompanies(formData: FormData) {
  const { supabase, user } = await requireUser();
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
  url.searchParams.set("q", query);
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

  for (const result of organicResults) {
    const normalizedWebsite = normalizeWebsiteUrl(result.link);

    if (!normalizedWebsite) {
      continue;
    }

    const hostname = new URL(normalizedWebsite).hostname;
    const companyName = extractCompanyName(result.title, hostname);

    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("created_by", user.id)
      .eq("website_url", normalizedWebsite)
      .maybeSingle();

    let companyId = existingCompany?.id;

    if (!companyId) {
      const { data: createdCompany } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          website_url: normalizedWebsite,
          industry: niche,
          city: location,
          country: "Sweden",
          description: result.snippet ?? null,
          status: "new",
          created_by: user.id,
        })
        .select("id")
        .single();

      companyId = createdCompany?.id;
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

      await analyzeWebsiteForCompany(supabase, companyId, company.website_url);
      const score = await scoreCompanyLead(supabase, companyId, company);

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

        await createAutoDraftForHotLead(supabase, user.id, companyId, company, score);
      }
    } catch {
      // Keep search resilient if automation fails for one lead.
    }
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?search=${encodeURIComponent(query)}`);
}

export async function analyzeLeadWebsite(formData: FormData) {
  const { supabase } = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const { data: company } = await supabase.from("companies").select("website_url").eq("id", companyId).maybeSingle();

  if (!company?.website_url) {
    redirect(`/dashboard/companies/${companyId}?error=missing_website`);
  }

  try {
    await analyzeWebsiteForCompany(supabase, companyId, company.website_url);
  } catch {
    redirect(`/dashboard/companies/${companyId}?error=analysis_failed`);
  }

  revalidatePath(`/dashboard/companies/${companyId}`);
  redirect(`/dashboard/companies/${companyId}?analysis=done`);
}

export async function scoreLead(formData: FormData) {
  const { supabase } = await requireUser();
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
    await scoreCompanyLead(supabase, companyId, company);
  } catch {
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
  const { supabase, user } = await requireUser();

  await supabase.from("email_templates").insert({
    name: String(formData.get("name") ?? "").trim() || "Default template",
    subject_template: String(formData.get("subjectTemplate") ?? "").trim() || null,
    body_template: String(formData.get("bodyTemplate") ?? "").trim() || null,
    niche: String(formData.get("niche") ?? "").trim() || null,
    created_by: user.id,
  });

  revalidatePath("/dashboard/outreach");
}

export async function createCampaign(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect("/dashboard/outreach?error=campaign_name_required");
  }

  await supabase.from("campaigns").insert({
    name,
    niche: String(formData.get("niche") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    status: String(formData.get("status") ?? "").trim() || "draft",
    created_by: user.id,
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
  const { supabase, user } = await requireUser();
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
      created_by: user.id,
    })
    .select("id")
    .single();

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
  const { supabase } = await requireUser();
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
