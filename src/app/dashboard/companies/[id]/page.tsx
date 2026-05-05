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
  scoreLead,
  updateCompanyStatus,
  updateContact,
} from "../../actions";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ analysis?: string; demo?: string; error?: string; score?: string }>;
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

  const [{ data: contacts }, { data: notes }, { data: leadSources }, { data: leadScores }, { data: demos }, { data: drafts }, { data: sends }, { data: campaigns }, { data: templates }] = await Promise.all([
    supabase.from("contacts").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("company_notes").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_sources").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("lead_scores").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("qr_demos").select("*").eq("company_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("email_drafts").select("*").eq("company_id", id).order("created_at", { ascending: false }),
    supabase.from("email_sends").select("*").eq("company_id", id).order("sent_at", { ascending: false }),
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("email_templates").select("*").order("created_at", { ascending: false }),
  ]);

  const latestScore = leadScores?.[0] ?? null;
  const latestDemo = demos?.[0] ?? null;
  const errorMessage = getErrorMessage(query.error);
  const successMessage = getSuccessMessage(query);

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
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Contacts</CardTitle>
                <CardDescription>Add the people or inboxes you may contact later.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <form action={addContact} className="grid gap-3 md:grid-cols-2">
                  <input name="companyId" type="hidden" value={company.id} />
                  <Input name="name" placeholder="Contact name" />
                  <Input name="role" placeholder="Role" />
                  <Input name="email" placeholder="Email" type="email" />
                  <Input name="phone" placeholder="Phone" />
                  <Input name="contactType" placeholder="Type: owner, general, manager" />
                  <Input name="consentBasis" placeholder="Consent basis" />
                  <div className="md:col-span-2">
                    <Input name="sourceUrl" placeholder="Source URL" type="url" />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit">Add contact</Button>
                  </div>
                </form>

                <div className="space-y-3">
                  {(contacts ?? []).length === 0 ? (
                    <WorkspaceEmptyState text="No contacts yet." />
                  ) : (
                    (contacts ?? []).map((contact) => (
                      <details key={contact.id} className={`${workspaceSoftInsetClass} group`}>
                        <summary className="flex cursor-pointer list-none items-center justify-between p-4">
                          <div>
                            <p className="font-medium">{contact.name || contact.email || "Unnamed contact"}</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                              {[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ") || "No details yet"}
                            </p>
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)] group-open:hidden">Edit</span>
                          <span className="hidden text-xs text-[var(--muted-foreground)] group-open:block">Close</span>
                        </summary>
                        <form action={updateContact} className="grid gap-3 border-t border-[#efe9e1] p-4 md:grid-cols-2">
                          <input type="hidden" name="contactId" value={contact.id} />
                          <input type="hidden" name="companyId" value={id} />
                          <Input name="name" defaultValue={contact.name ?? ""} placeholder="Contact name" />
                          <Input name="role" defaultValue={contact.role ?? ""} placeholder="Role" />
                          <Input name="email" defaultValue={contact.email ?? ""} placeholder="Email" type="email" />
                          <Input name="phone" defaultValue={contact.phone ?? ""} placeholder="Phone" />
                          <Input name="contactType" defaultValue={contact.contact_type ?? ""} placeholder="Type: owner, general, manager" />
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

function getSuccessMessage(query: { analysis?: string; demo?: string; score?: string }) {
  if (query.analysis === "done") {
    return "Website analysis saved.";
  }

  if (query.score === "done") {
    return "Lead score saved.";
  }

  if (query.demo === "done") {
    return "Demo QR landing page created.";
  }

  return null;
}
