import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

import { createCampaign, createEmailTemplate, signOut } from "../actions";

const errorMessages: Record<string, string> = {
  campaign_name_required: "Campaign name is required.",
};

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: templates },
    { data: campaigns },
    { data: drafts },
    { data: sends },
    { count: approvedCount },
  ] = await Promise.all([
    supabase.from("email_templates").select("*").order("created_at", { ascending: false }),
    supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
    supabase.from("email_drafts").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("email_sends").select("*").order("sent_at", { ascending: false }).limit(20),
    supabase.from("email_drafts").select("*", { count: "exact", head: true }).eq("status", "approved"),
  ]);

  const campaignPerformance = (campaigns ?? []).map((campaign) => {
    const campaignSends = (sends ?? []).filter((send) => send.campaign_id === campaign.id);
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      total: campaignSends.length,
      opens: campaignSends.filter((send) => send.opened_at).length,
      clicks: campaignSends.filter((send) => send.clicked_at).length,
      replies: campaignSends.filter((send) => send.replied_at).length,
    };
  });

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border bg-white/80 p-6 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]" href="/dashboard">
              Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-semibold">Outreach</h1>
            <p className="mt-2 text-[var(--muted-foreground)]">
              Phase 7 to 9: templates, drafts, approvals, sending, and campaign performance.
            </p>
          </div>

          <form action={signOut}>
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        </header>

        {params.error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessages[params.error]}</p> : null}

        <section className="grid gap-5 md:grid-cols-4">
          <MetricCard title="Templates" value={String(templates?.length ?? 0)} />
          <MetricCard title="Campaigns" value={String(campaigns?.length ?? 0)} />
          <MetricCard title="Pending drafts" value={String((drafts ?? []).filter((draft) => draft.status === "needs_review").length)} />
          <MetricCard title="Approved to send" value={String(approvedCount ?? 0)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create template</CardTitle>
                <CardDescription>Reusable subject and body hints for AI-generated outreach drafts.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createEmailTemplate} className="space-y-3">
                  <Input name="name" placeholder="Template name" required />
                  <Input name="niche" placeholder="Niche" />
                  <Input name="subjectTemplate" placeholder="Subject guidance" />
                  <Textarea name="bodyTemplate" placeholder="Body guidance and positioning." />
                  <Button type="submit">Save template</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create campaign</CardTitle>
                <CardDescription>Group leads and drafts under one outreach effort.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createCampaign} className="space-y-3">
                  <Input name="name" placeholder="Campaign name" required />
                  <Input name="niche" placeholder="Niche" />
                  <Input name="location" placeholder="Location" />
                  <Input defaultValue="draft" name="status" placeholder="Status" />
                  <Button type="submit">Create campaign</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Draft review queue</CardTitle>
                <CardDescription>Edit and approve drafts before any email is sent.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(drafts ?? []).length === 0 ? (
                  <EmptyState text="No drafts yet." />
                ) : (
                  (drafts ?? []).map((draft) => (
                    <Link className="block rounded-2xl border p-4 transition hover:border-[var(--primary)]" href={`/dashboard/outreach/drafts/${draft.id}`} key={draft.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{draft.subject || "Untitled draft"}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{draft.status}</p>
                        </div>
                        <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                          {draft.status}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign performance</CardTitle>
                <CardDescription>Simple Phase 9 dashboard for sends, opens, clicks, and replies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaignPerformance.length === 0 ? (
                  <EmptyState text="No campaigns yet." />
                ) : (
                  campaignPerformance.map((campaign) => (
                    <div className="rounded-2xl border p-4" key={campaign.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{campaign.status}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>{campaign.total} sent</p>
                          <p className="text-[var(--muted-foreground)]">
                            {campaign.opens} opens · {campaign.clicks} clicks · {campaign.replies} replies
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-4xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed p-4 text-sm text-[var(--muted-foreground)]">{text}</div>;
}
