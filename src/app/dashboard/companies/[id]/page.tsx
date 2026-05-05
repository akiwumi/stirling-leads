import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceBanner, WorkspaceEmptyState, WorkspaceHero, WorkspacePill, workspaceCardClass, workspaceInsetClass, workspaceSelectClass, workspaceSoftInsetClass } from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";

import {
  addCompanyNote,
  addCompanyToCampaign,
  addContact,
  analyzeLeadWebsite,
  generateDemo,
  generateLeadDraft,
  markRoleTargetCovered,
  pushCompanyToCrm,
  refreshCompanyNow,
  scoreLead,
  scrapePersonnel,
  updateCompanyStatus,
  updateContact,
} from "../../actions";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ analysis?: string; demo?: string; error?: string; score?: string; scraped?: string; pages?: string; refreshed?: string; crm?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!company) {
    notFound();
  }

  const [{ data: contacts }, { data: notes }, { data: leadSources }, { data: leadScores }, { data: demos }, { data: drafts }, { data: sends }, { data: campaigns }, { data: templates }, { data: roleTargets }] = await Promise.all([
    supabase.from("contacts").select("*").eq("company_id", id).order("is_decision_maker", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("company_notes").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_sources").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_scores").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("qr_demos").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("email_drafts").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("email_sends").select("*").eq("company_id", id).order("sent_at", { ascending: false }),
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("email_templates").select("*").order("created_at", { ascending: false }),
    supabase.from("company_role_targets").select("*").eq("company_id", id).order("priority", { ascending: true }).order("role_label", { ascending: true }),
  ]);

  const latestScore = leadScores?.[0] ?? null;
  const latestDemo = demos?.[0] ?? null;
  const errorMessage = getErrorMessage(query.error);
  const successMessage = getSuccessMessage({ analysis: query.analysis, demo: query.demo, score: query.score, scraped: query.scraped, pages: query.pages });

  const timeline = [
    {
      id: `company-${company.id}`,
      label: "Company added",
      detail: company.website_url || "Manual lead entry",
      createdAt: company.created_at,
    },
    ...(contacts ?? []).map((contact) => ({
      id: `contact-${contact.id}`,
      label: "Contact added",
      detail: contact.email || contact.name || "Unnamed contact",
      createdAt: contact.created_at,
    })),
    ...(notes ?? []).map((note) => ({
      id: `note-${note.id}`,
      label: "Note added",
      detail: note.body,
      createdAt: note.created_at,
    })),
    ...(leadSources ?? []).map((source) => ({
      id: `source-${source.id}`,
      label: "Evidence saved",
      detail: source.source_url,
      createdAt: source.created_at,
    })),
    ...(drafts ?? []).map((draft) => ({
      id: `draft-${draft.id}`,
      label: `Draft ${draft.status}`,
      detail: draft.subject || "Untitled outreach draft",
      createdAt: draft.created_at,
    })),
    ...(sends ?? []).map((send) => ({
      id: `send-${send.id}`,
      label: "Email sent",
      detail: send.provider_message_id || "Provider message logged",
      createdAt: send.sent_at || send.created_at || company.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <main className="space-y-8">
      <WorkspaceHero
        actions={
          <>
            <Link className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white" href="/dashboard">
              Back to dashboard
            </Link>
            {company.website_url ? (
              <a className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white" href={company.website_url} target="_blank" rel="noreferrer">
                Visit website
              </a>
            ) : null}
          </>
        }
        description={`${company.city ? `${company.city}, ` : ""}${company.country || "No country set"} · ${company.status}`}
        eyebrow="Lead profile"
        title={company.name}
      />

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            {errorMessage ? <WorkspaceBanner tone="error" text={errorMessage} /> : null}
            {successMessage ? <WorkspaceBanner tone="success" text={successMessage} /> : null}

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Lead details</CardTitle>
                <CardDescription>Manual CRM record with status, contacts, notes, and saved search evidence.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <Info label="Industry" value={company.industry} />
                  <Info label="Website" value={company.website_url} />
                  <Info label="Address" value={company.address_line} />
                  <Info label="Description" value={company.description} />
                </div>
                <form action={updateCompanyStatus} className={`space-y-3 p-4 ${workspaceInsetClass}`}>
                  <input name="companyId" type="hidden" value={company.id} />
                  <label className="block text-sm font-medium" htmlFor="status">
                    Status
                  </label>
                  <select
                    className={workspaceSelectClass}
                    defaultValue={company.status ?? "new"}
                    id="status"
                    name="status"
                  >
                    <option value="new">new</option>
                    <option value="researching">researching</option>
                    <option value="qualified">qualified</option>
                    <option value="contacted">contacted</option>
                    <option value="won">won</option>
                    <option value="lost">lost</option>
                  </select>
                  <Button type="submit">Update status</Button>
                </form>
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Analysis and scoring</CardTitle>
                <CardDescription>Phases 4 to 6: website evidence, AI score, and demo QR landing page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <form action={analyzeLeadWebsite}>
                    <input name="companyId" type="hidden" value={company.id} />
                    <Button type="submit" variant="outline">
                      Analyze website
                    </Button>
                  </form>
                  <form action={scoreLead}>
                    <input name="companyId" type="hidden" value={company.id} />
                    <Button type="submit" variant="outline">
                      Score with AI
                    </Button>
                  </form>
                  <form action={generateDemo}>
                    <input name="companyId" type="hidden" value={company.id} />
                    <Button type="submit">Generate demo QR</Button>
                  </form>
                  <form action={pushCompanyToCrm}>
                    <input name="companyId" type="hidden" value={company.id} />
                    <input name="provider" type="hidden" value="hubspot" />
                    <Button type="submit" variant="outline">
                      Push to HubSpot
                    </Button>
                  </form>
                  <form action={refreshCompanyNow}>
                    <input name="companyId" type="hidden" value={company.id} />
                    <Button type="submit" variant="outline">
                      Refresh now
                    </Button>
                  </form>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className={`${workspaceInsetClass} p-4`}>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Latest AI score</p>
                    {latestScore ? (
                      <>
                        <p className="mt-3 text-4xl font-semibold">{latestScore.score}</p>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                          {latestScore.category} · confidence {latestScore.confidence}
                        </p>
                        <p className="mt-4 text-sm">{latestScore.qr_use_case}</p>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{latestScore.recommended_pitch || latestScore.reason}</p>
                      </>
                    ) : (
                      <WorkspaceEmptyState text="No AI score yet." />
                    )}
                  </div>

                  <div className={`${workspaceInsetClass} p-4`}>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Latest demo</p>
                    {latestDemo ? (
                      <>
                        <p className="mt-3 font-medium">{latestDemo.title || "Demo QR landing page"}</p>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{latestDemo.use_case || "No use case saved"}</p>
                        <div className="mt-4 flex items-start gap-4">
                          {latestDemo.qr_code_url ? (
                            <Image
                              alt="Generated demo QR code"
                              className="h-28 w-28 rounded-2xl border bg-white p-2"
                              height={112}
                              src={latestDemo.qr_code_url}
                              unoptimized
                              width={112}
                            />
                          ) : null}
                          <div className="space-y-2 text-sm">
                            <Link className="text-[var(--primary)] underline-offset-4 hover:underline" href={latestDemo.demo_url || "#"} target="_blank">
                              Open demo
                            </Link>
                            <p className="text-[var(--muted-foreground)]">{formatDate(latestDemo.created_at)}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <WorkspaceEmptyState text="No demo generated yet." />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Outreach</CardTitle>
                <CardDescription>Phases 7 to 9: generate drafts, attach campaigns, review approval state, and track sends.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form action={generateLeadDraft} className="grid gap-3">
                  <input name="companyId" type="hidden" value={company.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="contactId">
                        Contact
                      </label>
                      <select
                        className={workspaceSelectClass}
                        defaultValue=""
                        id="contactId"
                        name="contactId"
                        required
                      >
                        <option value="" disabled>
                          Select contact
                        </option>
                        {(contacts ?? []).filter((contact) => contact.email).map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.name || contact.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="campaignId">
                        Campaign
                      </label>
                      <select
                        className={workspaceSelectClass}
                        defaultValue=""
                        id="campaignId"
                        name="campaignId"
                      >
                        <option value="">No campaign</option>
                        {(campaigns ?? []).map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="templateId">
                      Template
                    </label>
                    <select
                      className={workspaceSelectClass}
                      defaultValue=""
                      id="templateId"
                      name="templateId"
                    >
                      <option value="">No template</option>
                      {(templates ?? []).map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit">Generate outreach draft</Button>
                </form>

                <form action={addCompanyToCampaign} className="flex flex-wrap gap-3">
                  <input name="companyId" type="hidden" value={company.id} />
                  <select
                    className={`${workspaceSelectClass} min-w-56`}
                    defaultValue=""
                    name="campaignId"
                  >
                    <option value="" disabled>
                      Add to campaign
                    </option>
                    {(campaigns ?? []).map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline">
                    Save campaign link
                  </Button>
                </form>

                <div className="space-y-3">
                  {(drafts ?? []).length === 0 ? (
                    <WorkspaceEmptyState text="No drafts yet." />
                  ) : (
                    (drafts ?? []).map((draft) => (
                      <Link className={`block p-4 transition hover:border-white hover:bg-white ${workspaceInsetClass}`} href={`/dashboard/outreach/drafts/${draft.id}`} key={draft.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{draft.subject || "Untitled draft"}</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{draft.status}</p>
                          </div>
                          <WorkspacePill>{draft.status}</WorkspacePill>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">People</CardTitle>
                  <CardDescription>
                    Contacts and decision-makers at this company.
                    {company.personnel_coverage_status && company.personnel_coverage_status !== "unknown" ? (
                      <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${coverageBadgeClass(company.personnel_coverage_status)}`}>
                        {formatCoverage(company.personnel_coverage_status)}
                      </span>
                    ) : null}
                  </CardDescription>
                </div>
                <form action={scrapePersonnel}>
                  <input name="companyId" type="hidden" value={company.id} />
                  <Button type="submit" variant="outline" className="shrink-0 text-sm">
                    Scan team pages
                  </Button>
                </form>
              </CardHeader>
              <CardContent className="space-y-5">
                {company.personnel_gap_notes ? (
                  <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
                    {company.personnel_gap_notes}
                  </div>
                ) : null}

                {(roleTargets ?? []).length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {(roleTargets ?? []).map((target) => {
                      const matched = (contacts ?? []).find((contact) => contact.id === target.primary_contact_id);
                      const covered = target.status === "covered";
                      return (
                        <div key={target.id} className={`${workspaceInsetClass} p-4`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-800">{target.role_label}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{target.role_bucket}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${covered ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                              {covered ? "Covered" : "Missing"}
                            </span>
                          </div>
                          {matched ? (
                            <Link href={`/dashboard/people/${matched.id}`} className="mt-3 block text-sm text-blue-600 hover:underline">
                              {matched.name || matched.work_email || matched.email || "Open matched person"} →
                            </Link>
                          ) : target.notes ? (
                            <p className="mt-3 text-sm text-slate-500">{target.notes}</p>
                          ) : (
                            <form action={markRoleTargetCovered} className="mt-3">
                              <input type="hidden" name="companyId" value={company.id} />
                              <input type="hidden" name="targetId" value={target.id} />
                              <Button type="submit" variant="outline" className="text-xs">
                                Mark role as covered
                              </Button>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <form action={addContact} className="grid gap-3 md:grid-cols-2">
                  <input name="companyId" type="hidden" value={company.id} />
                  <Input name="name" placeholder="Full name" />
                  <Input name="jobTitle" placeholder="Job title (e.g. Head of Marketing)" />
                  <Input name="email" placeholder="Work email" type="email" />
                  <Input name="phone" placeholder="Direct phone" />
                  <Input name="linkedinUrl" placeholder="LinkedIn URL" />
                  <select name="seniority" className={workspaceSelectClass}>
                    <option value="">Seniority</option>
                    <option value="c_suite">C-Suite</option>
                    <option value="vp">VP / Director</option>
                    <option value="manager">Manager / Head</option>
                    <option value="individual">Individual Contributor</option>
                  </select>
                  <select name="department" className={workspaceSelectClass}>
                    <option value="">Department</option>
                    <option value="Executive">Executive</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Customer Success">Customer Success</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="HR">HR</option>
                  </select>
                  <Input name="sourceUrl" placeholder="Source URL" type="url" />
                  <div className="md:col-span-2">
                    <Button type="submit">Add person</Button>
                  </div>
                </form>

                <div className="space-y-3">
                  {(contacts ?? []).length === 0 ? (
                    <WorkspaceEmptyState text="No people yet. Use 'Scan team pages' to auto-find or add manually above." />
                  ) : (
                    (contacts ?? []).map((contact) => (
                      <details key={contact.id} className={`${workspaceSoftInsetClass} group`}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contact.name || contact.work_email || contact.email || "Unnamed"}</p>
                              {contact.is_decision_maker ? (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">DM</span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                              {[contact.job_title || contact.role, contact.role_normalized, contact.seniority].filter(Boolean).join(" · ") || "No title set"}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
                              {(contact.work_email || contact.email) ? <span>{contact.work_email || contact.email}</span> : null}
                              {(contact.direct_phone || contact.phone) ? <span>{contact.direct_phone || contact.phone}</span> : null}
                              {contact.linkedin_url ? (
                                <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                  LinkedIn ↗
                                </a>
                              ) : null}
                              {contact.source_url ? (
                                <a href={contact.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                  Source page ↗
                                </a>
                              ) : null}
                              {contact.source_type ? <span className="opacity-60">{contact.source_type.replace(/_/g, " ")}</span> : null}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-[var(--muted-foreground)] group-open:hidden">Edit</span>
                          <span className="hidden shrink-0 text-xs text-[var(--muted-foreground)] group-open:block">Close</span>
                        </summary>
                        <form action={updateContact} className="grid gap-3 border-t border-[#efe9e1] p-4 md:grid-cols-2">
                          <input type="hidden" name="contactId" value={contact.id} />
                          <input type="hidden" name="companyId" value={id} />
                          <Input name="name" defaultValue={contact.name ?? ""} placeholder="Full name" />
                          <Input name="jobTitle" defaultValue={contact.job_title ?? contact.role ?? ""} placeholder="Job title" />
                          <Input name="email" defaultValue={contact.work_email ?? contact.email ?? ""} placeholder="Work email" type="email" />
                          <Input name="phone" defaultValue={contact.direct_phone ?? contact.phone ?? ""} placeholder="Direct phone" />
                          <Input name="linkedinUrl" defaultValue={contact.linkedin_url ?? ""} placeholder="LinkedIn URL" />
                          <select name="seniority" defaultValue={contact.seniority ?? ""} className={workspaceSelectClass}>
                            <option value="">Seniority</option>
                            <option value="c_suite">C-Suite</option>
                            <option value="vp">VP / Director</option>
                            <option value="manager">Manager / Head</option>
                            <option value="individual">Individual Contributor</option>
                          </select>
                          <select name="department" defaultValue={contact.department ?? ""} className={workspaceSelectClass}>
                            <option value="">Department</option>
                            <option value="Executive">Executive</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Sales">Sales</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Operations">Operations</option>
                            <option value="Finance">Finance</option>
                            <option value="Customer Success">Customer Success</option>
                            <option value="Product">Product</option>
                            <option value="Design">Design</option>
                            <option value="HR">HR</option>
                          </select>
                          <Input name="consentBasis" defaultValue={contact.consent_basis ?? ""} placeholder="Consent basis" />
                          <div className="md:col-span-2">
                            <Button type="submit">Save changes</Button>
                          </div>
                        </form>
                      </details>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Website evidence</CardTitle>
                <CardDescription>Saved findings from website analysis and search intake.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {(leadSources ?? []).length === 0 ? (
                    <WorkspaceEmptyState text="No evidence yet." />
                  ) : (
                    (leadSources ?? []).map((source) => (
                      <div className={`${workspaceSoftInsetClass} p-4 text-sm`} key={source.id}>
                        <p className="font-medium">{formatSourceLabel(source.source_type)}</p>
                        <p className="mt-1 break-all">{source.found_text || source.source_url}</p>
                        <p className="mt-2 break-all text-[var(--muted-foreground)]">{source.source_url}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Notes</CardTitle>
                <CardDescription>Quick research and outreach notes for this lead.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={addCompanyNote} className="space-y-3">
                  <input name="companyId" type="hidden" value={company.id} />
                  <Textarea name="body" placeholder="Menu is still a PDF. Good QR use case for a mobile menu." required />
                  <Button type="submit">Save note</Button>
                </form>
                <div className="space-y-3">
                  {(notes ?? []).length === 0 ? (
                    <WorkspaceEmptyState text="No notes yet." />
                  ) : (
                    (notes ?? []).map((note) => (
                      <div className={`${workspaceSoftInsetClass} p-4 text-sm`} key={note.id}>
                        <p>{note.body}</p>
                        <p className="mt-2 text-[var(--muted-foreground)]">{formatDate(note.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Activity history</CardTitle>
                <CardDescription>Timeline from manual entry, contacts, notes, and search evidence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {timeline.map((item) => (
                  <div className={`${workspaceSoftInsetClass} p-4`} key={item.id}>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-1 break-all text-sm text-[var(--muted-foreground)]">{item.detail}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{formatDate(item.createdAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Send tracking</CardTitle>
                <CardDescription>Recent outreach events for this lead.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(sends ?? []).length === 0 ? (
                  <WorkspaceEmptyState text="No send records yet." />
                ) : (
                  (sends ?? []).map((send) => (
                    <div className={`${workspaceSoftInsetClass} p-4 text-sm`} key={send.id}>
                      <p className="font-medium">Provider ID: {send.provider_message_id || "pending"}</p>
                      <p className="mt-1 text-[var(--muted-foreground)]">
                        Sent {send.sent_at ? formatDate(send.sent_at) : "not yet"} · opens {send.opened_at ? "yes" : "no"} · clicks {send.clicked_at ? "yes" : "no"} · replies{" "}
                        {send.replied_at ? "yes" : "no"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className={`p-4 ${workspaceSoftInsetClass}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 break-all">{value || "Not set"}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSourceLabel(value: string | null) {
  return (value || "evidence").replaceAll("_", " ");
}

function getErrorMessage(value?: string) {
  if (value === "analysis_failed") {
    return "Website analysis failed.";
  }

  if (value === "missing_evidence") {
    return "Run website analysis before AI scoring.";
  }

  if (value === "missing_website") {
    return "Add a website URL before website analysis.";
  }

  if (value === "scoring_failed") {
    return "AI scoring failed. Check OPENAI_API_KEY and model access.";
  }

  if (value === "draft_failed") {
    return "Draft generation failed.";
  }

  if (value === "missing_contact_email") {
    return "Choose a contact with an email address before generating a draft.";
  }

  return null;
}

function getSuccessMessage(query: { analysis?: string; demo?: string; score?: string; scraped?: string; pages?: string }) {
  if (query.analysis === "done") {
    return "Website analysis saved.";
  }

  if (query.score === "done") {
    return "Lead score saved.";
  }

  if (query.demo === "done") {
    return "Demo QR landing page created.";
  }

  if (query.scraped !== undefined) {
    const count = query.scraped ?? "0";
    const pages = query.pages ?? "0";
    return `Team page scan complete. Found ${count} ${Number(count) === 1 ? "person" : "people"} across ${pages} ${Number(pages) === 1 ? "page" : "pages"}.`;
  }

  return null;
}

function coverageBadgeClass(status: string) {
  if (status === "complete") return "bg-emerald-100 text-emerald-800";
  if (status === "partial") return "bg-amber-100 text-amber-800";
  if (status === "missing_key_roles") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function formatCoverage(status: string) {
  if (status === "complete") return "Coverage: Complete";
  if (status === "partial") return "Coverage: Partial";
  if (status === "missing_key_roles") return "Missing key roles";
  return status;
}
