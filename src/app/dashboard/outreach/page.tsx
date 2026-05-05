import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MailCheck, Megaphone, PenSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceEmptyState, WorkspaceHero, WorkspaceMetricCard, WorkspacePill, workspaceCardClass, workspaceInsetClass, workspaceSoftInsetClass } from "@/components/workspace-theme";
import { createClient } from "@/lib/supabase/server";

import { createCampaign, createEmailTemplate } from "../actions";

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
    <main className="space-y-8">
      <WorkspaceHero
        actions={
          <>
            <Link href="/dashboard/analytics">
              <Button className="rounded-full bg-white/85 text-slate-800 hover:bg-white" type="button" variant="outline">
                View conversion analytics
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="rounded-full" type="button">
                Back to leads
              </Button>
            </Link>
          </>
        }
        description="Build templates, group companies into campaigns, review AI-generated drafts, and watch which sectors actually reply."
        eyebrow="Outreach studio"
        title="Draft, approve, send, learn"
        tone="apricot"
      />

      {params.error ? <div className="rounded-[1.5rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700">{errorMessages[params.error]}</div> : null}

      <section className="grid gap-5 md:grid-cols-4">
        <MetricCard icon={<PenSquare className="h-4 w-4" />} title="Templates" value={String(templates?.length ?? 0)} />
        <MetricCard icon={<Megaphone className="h-4 w-4" />} title="Campaigns" value={String(campaigns?.length ?? 0)} />
        <MetricCard icon={<MailCheck className="h-4 w-4" />} title="Pending drafts" value={String((drafts ?? []).filter((draft) => draft.status === "needs_review").length)} />
        <MetricCard icon={<Send className="h-4 w-4" />} title="Approved to send" value={String(approvedCount ?? 0)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-6">
            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Create template</CardTitle>
                <CardDescription>Reusable subject and body hints for AI-generated outreach drafts.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createEmailTemplate} className="space-y-3">
                  <Input className="border-white/70 bg-white/80" name="name" placeholder="Template name" required />
                  <Input className="border-white/70 bg-white/80" name="niche" placeholder="Niche" />
                  <Input className="border-white/70 bg-white/80" name="subjectTemplate" placeholder="Subject guidance" />
                  <Textarea className="border-white/70 bg-white/80" name="bodyTemplate" placeholder="Body guidance and positioning." />
                  <Button className="rounded-full" type="submit">Save template</Button>
                </form>
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Create campaign</CardTitle>
                <CardDescription>Group leads and drafts under one outreach effort.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createCampaign} className="space-y-3">
                  <Input className="border-white/70 bg-white/80" name="name" placeholder="Campaign name" required />
                  <Input className="border-white/70 bg-white/80" name="niche" placeholder="Niche" />
                  <Input className="border-white/70 bg-white/80" name="location" placeholder="Location" />
                  <Input className="border-white/70 bg-white/80" defaultValue="draft" name="status" placeholder="Status" />
                  <Button className="rounded-full" type="submit">Create campaign</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={workspaceCardClass}>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Draft review queue</CardTitle>
                    <CardDescription>Edit and approve drafts before any email is sent.</CardDescription>
                  </div>
                  <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-800" href="/dashboard/analytics">
                    See sector reply rates
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(drafts ?? []).length === 0 ? (
                  <WorkspaceEmptyState text="No drafts yet." />
                ) : (
                  (drafts ?? []).map((draft) => (
                    <Link className={`block p-4 transition hover:border-white hover:bg-white ${workspaceInsetClass}`} href={`/dashboard/outreach/drafts/${draft.id}`} key={draft.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">{draft.subject || "Untitled draft"}</p>
                          <p className="mt-1 text-sm text-slate-500">{draft.status}</p>
                        </div>
                        <WorkspacePill>{draft.status}</WorkspacePill>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className={workspaceCardClass}>
              <CardHeader>
                <CardTitle className="font-[family:var(--font-display)] text-2xl tracking-[-0.04em]">Campaign performance</CardTitle>
                <CardDescription>Simple Phase 9 dashboard for sends, opens, clicks, and replies.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaignPerformance.length === 0 ? (
                  <WorkspaceEmptyState text="No campaigns yet." />
                ) : (
                  campaignPerformance.map((campaign) => (
                    <div className={`${workspaceSoftInsetClass} p-4`} key={campaign.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">{campaign.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{campaign.status}</p>
                        </div>
                        <div className="text-right text-sm text-slate-700">
                          <p>{campaign.total} sent</p>
                          <p className="text-slate-500">
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
    </main>
  );
}

function MetricCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return <WorkspaceMetricCard icon={icon} title={title} value={value} />;
}
