import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceBanner, WorkspaceEmptyState, WorkspaceHero, workspaceCardClass } from "@/components/workspace-theme";
import { buildSearchQuery, extractCompanyName, inferCountryFromHostname, isLikelyAggregatorSite, lookupCountryForLocation, normalizeWebsiteUrl } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceOwnerId } from "@/lib/workspace";

import { SearchResultsClient, type ClientResult } from "./SearchResultsClient";

type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string; location?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceOwnerId = await getWorkspaceOwnerId(supabase, user.id);

  const niche = params.niche?.trim() ?? "";
  const location = params.location?.trim() ?? "";
  const hasQuery = niche && location;

  let clientResults: ClientResult[] = [];
  let searchError: string | null = null;

  // Resolve country once for the whole search — one geocoding call covers all results
  const locationCountry = hasQuery ? await lookupCountryForLocation(location) : null;

  if (hasQuery) {
    const apiKey = process.env.SERPAPI_KEY;

    if (!apiKey) {
      searchError = "SERPAPI_KEY is not configured. Add it to your environment variables.";
    } else {
      try {
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "google");
        url.searchParams.set("q", buildSearchQuery(niche, location));
        url.searchParams.set("num", "20");
        url.searchParams.set("api_key", apiKey);

        const response = await fetch(url, { method: "GET", cache: "no-store" });

        if (response.ok) {
          const payload = (await response.json()) as { organic_results?: SearchResult[] };
          const rawResults = (payload.organic_results ?? []).filter((r) => {
            const normalized = normalizeWebsiteUrl(r.link);
            return normalized && !isLikelyAggregatorSite(normalized, r.title, r.snippet, niche);
          });

          // Find already-saved websites to show "In directory" badge
          let existingWebsites = new Set<string>();
          if (rawResults.length > 0) {
            const websiteUrls = rawResults
              .map((r) => normalizeWebsiteUrl(r.link))
              .filter(Boolean) as string[];

            const { data: existing } = await supabase
              .from("companies")
              .select("website_url")
              .eq("created_by", workspaceOwnerId)
              .in("website_url", websiteUrls);

            existingWebsites = new Set(
              (existing ?? []).map((c) => c.website_url).filter(Boolean) as string[]
            );
          }

          clientResults = rawResults.map((r) => {
            const normalized = normalizeWebsiteUrl(r.link);
            const hostname = normalized
              ? new URL(normalized).hostname.replace(/^www\./, "")
              : r.link;
            // Use the geocoded country; fall back to domain TLD per result
            const country = locationCountry ?? inferCountryFromHostname(hostname);
            return {
              title: r.title,
              link: r.link,
              snippet: r.snippet,
              normalized,
              hostname,
              companyName: extractCompanyName(r.title, hostname),
              country,
              alreadyAdded: normalized ? existingWebsites.has(normalized) : false,
            };
          });
        } else {
          searchError = "Search provider request failed. Try again in a moment.";
        }
      } catch {
        searchError = "Search failed. Check your network connection.";
      }
    }
  }

  return (
    <main className="space-y-6">
      <WorkspaceHero
        eyebrow="Lead search"
        title="Search new leads"
        description="Search by niche and location. Select the results you want, then click Done to add them — AI will automatically extract email addresses and contact details."
        tone="apricot"
        actions={
          <Link href="/dashboard/directory">
            <Button variant="outline" className="rounded-full bg-white/85 text-slate-800 hover:bg-white" type="button">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to directory
            </Button>
          </Link>
        }
      />

      {searchError ? <WorkspaceBanner text={searchError} tone="error" /> : null}

      {/* Search form */}
      <form method="GET" className={`${workspaceCardClass} p-6`}>
        <h2 className="mb-4 font-[family:var(--font-display)] text-xl font-semibold tracking-[-0.04em] text-slate-900">
          Search parameters
        </h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-[0.18em] text-slate-400">Niche</label>
            <Input
              name="niche"
              defaultValue={niche}
              placeholder="e.g. restaurants, hotels, estate agents"
              className="border-white/70 bg-white/80"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-[0.18em] text-slate-400">Location</label>
            <Input
              name="location"
              defaultValue={location}
              placeholder="e.g. Glasgow, Stockholm, Paris"
              className="border-white/70 bg-white/80"
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="rounded-full h-11 w-full md:w-auto">
              Search
            </Button>
          </div>
        </div>
      </form>

      {/* Results */}
      {hasQuery && !searchError ? (
        <div className={workspaceCardClass}>
          <div className="p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-[family:var(--font-display)] text-xl font-semibold tracking-[-0.04em] text-slate-900">
                  {clientResults.length} results for &ldquo;{niche}&rdquo; in {location}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Aggregator, review, and booking sites have been filtered out. Select results and click Done to add them.
                </p>
              </div>
            </div>

            {clientResults.length === 0 ? (
              <WorkspaceEmptyState text="No results found after filtering. Try a different niche or location." />
            ) : (
              <SearchResultsClient
                results={clientResults}
                niche={niche}
                location={location}
              />
            )}
          </div>
        </div>
      ) : !hasQuery ? (
        <div className={`${workspaceCardClass} p-8 text-center`}>
          <p className="text-slate-400">Enter a niche and location above to search for leads.</p>
        </div>
      ) : null}
    </main>
  );
}
