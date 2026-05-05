import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceBanner, WorkspaceEmptyState, WorkspaceHero, WorkspacePill, workspaceCardClass, workspaceInsetClass, workspaceSoftInsetClass } from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";

import { approveDraft, markSendEvent, sendApprovedDraft, updateDraft } from "../../../actions";

const errorMessages: Record<string, string> = {
  already_sent: "This draft already has a send record.",
  contact_unsubscribed: "This contact is on the suppression list or already unsubscribed.",
  daily_limit_reached: "You reached the daily send limit. Try again tomorrow or raise DAILY_SEND_LIMIT.",
  draft_not_approved: "Approve the draft before sending.",
  missing_resend: "Add RESEND_API_KEY and RESEND_FROM_EMAIL before sending.",
  send_failed: "Provider send failed.",
};

export default async function DraftDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; sent?: string }>;
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

  const { data: draft } = await supabase.from("email_drafts").select("*").eq("id", id).maybeSingle();

  if (!draft) {
    notFound();
  }

  const [{ data: company }, { data: contact }, { data: emailSend }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("id", draft.company_id).maybeSingle(),
    draft.contact_id ? supabase.from("contacts").select("name, email").eq("id", draft.contact_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("email_sends").select("*").eq("draft_id", draft.id).order("sent_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <main className="space-y-8">
      <WorkspaceHero
        actions={
          <Link className="inline-flex rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white" href="/dashboard/outreach">
            Back to outreach
          </Link>
        }
        description={`${company?.name || "Lead"} · ${contact?.email || "No contact email"}`}
        eyebrow="Draft review"
        title="Review, approve, send"
      />

      {query.error ? <WorkspaceBanner tone="error" text={errorMessages[query.error] || "Action failed."} /> : null}
      {query.sent === "done" ? <WorkspaceBanner tone="success" text="Email sent and logged." /> : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className={workspaceCardClass}>
            <CardHeader>
              <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Edit draft</CardTitle>
              <CardDescription>Review, edit, and approve before sending.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={updateDraft} className="space-y-4">
                <input name="draftId" type="hidden" value={draft.id} />
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="subject">
                    Subject
                  </label>
                  <Input defaultValue={draft.subject || ""} id="subject" name="subject" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="body">
                    Body
                  </label>
                  <Textarea className="min-h-64" defaultValue={draft.body || ""} id="body" name="body" required />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" variant="outline">
                    Save edits
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap gap-3">
                <form action={approveDraft}>
                  <input name="draftId" type="hidden" value={draft.id} />
                  <Button type="submit">Approve draft</Button>
                </form>
                <form action={sendApprovedDraft}>
                  <input name="draftId" type="hidden" value={draft.id} />
                  <Button type="submit" variant="outline">
                    Send approved draft
                  </Button>
                </form>
              </div>
            </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className={`${workspaceInsetClass} p-4`}>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Draft status</p>
                  <div className="mt-3"><WorkspacePill>{draft.status}</WorkspacePill></div>
                </div>
                <div className={`${workspaceSoftInsetClass} p-4`}>
                  <p>Approved: {draft.approved_by_user ? "yes" : "no"}</p>
                  <p className="mt-2">Company: {company?.name || "unknown"}</p>
                  <p className="mt-2">Recipient: {contact?.email || "missing"}</p>
                </div>
              </CardContent>
          </Card>

          <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em] text-slate-800">Tracking</CardTitle>
                <CardDescription>Manual Phase 9 updates for opens, clicks, replies, and bounces.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {emailSend ? (
                  <>
                    <div className={`${workspaceSoftInsetClass} p-4 text-sm text-[var(--muted-foreground)]`}>
                      Sent {emailSend.sent_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(emailSend.sent_at)) : "not yet"}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {["opened", "clicked", "replied", "bounced"].map((event) => (
                        <form action={markSendEvent} key={event}>
                          <input name="emailSendId" type="hidden" value={emailSend.id} />
                          <input name="event" type="hidden" value={event} />
                          <Button type="submit" variant="outline">
                            Mark {event}
                          </Button>
                        </form>
                      ))}
                    </div>
                  </>
                ) : (
                  <WorkspaceEmptyState text="No send record yet." />
                )}
              </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
