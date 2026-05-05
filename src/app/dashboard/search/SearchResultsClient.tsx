"use client";

import { useState, useTransition } from "react";
import { Building2, Check, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkspacePill } from "@/components/workspace-theme";
import { addMultipleSearchResults } from "../actions";

export type ClientResult = {
  title: string;
  link: string;
  snippet?: string;
  normalized: string | null;
  hostname: string;
  companyName: string;
  country: string | null;
  alreadyAdded: boolean;
};

export function SearchResultsClient({
  results,
  niche,
  location,
}: {
  results: ClientResult[];
  niche: string;
  location: string;
}) {
  const selectableResults = results.filter((r) => !r.alreadyAdded && r.normalized);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected =
    selectableResults.length > 0 && selectableResults.every((r) => selected.has(r.normalized!));
  const selectedCount = selected.size;

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableResults.map((r) => r.normalized!)));
    }
  }

  function handleDone() {
    const selectedItems = results
      .filter((r) => r.normalized && selected.has(r.normalized))
      .map((r) => ({
        name: r.companyName,
        websiteUrl: r.normalized!,
        snippet: r.snippet ?? "",
        niche,
        location,
        country: r.country ?? "",
      }));

    const fd = new FormData();
    fd.set("selections", JSON.stringify(selectedItems));
    startTransition(() => addMultipleSearchResults(fd));
  }

  return (
    <div className="space-y-3">
      {/* Controls bar */}
      <div className="flex items-center justify-between gap-4 pb-1">
        <button
          type="button"
          onClick={toggleAll}
          disabled={selectableResults.length === 0 || isPending}
          className="text-sm text-slate-500 transition hover:text-slate-800 disabled:opacity-40"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>

        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <span className="text-sm text-slate-500">
              {selectedCount} selected
            </span>
          )}
          <Button
            type="button"
            onClick={handleDone}
            disabled={selectedCount === 0 || isPending}
            className="rounded-full h-9 px-5"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Adding…
              </>
            ) : selectedCount > 0 ? (
              `Done — Add ${selectedCount}`
            ) : (
              "Done"
            )}
          </Button>
        </div>
      </div>

      {/* Result rows */}
      {results.map((result) => {
        const isSelected = result.normalized ? selected.has(result.normalized) : false;
        const isSelectable = !result.alreadyAdded && !!result.normalized;

        return (
          <div
            key={result.link}
            onClick={() => {
              if (isSelectable && !isPending) toggle(result.normalized!);
            }}
            className={`flex cursor-pointer items-start justify-between gap-4 rounded-[1.75rem] border p-4 transition select-none ${
              result.alreadyAdded
                ? "cursor-default border-emerald-200 bg-emerald-50/60"
                : isSelected
                ? "border-red-300 bg-red-50/50 shadow-[0_0_0_2px_rgba(239,68,68,0.15)]"
                : "border-[#efe9e1] bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(249,247,243,0.95))] hover:border-[#e0d8cf] hover:bg-white"
            }`}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0ebe3] text-slate-500">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{result.companyName}</p>
                  {result.country ? <WorkspacePill>{result.country}</WorkspacePill> : null}
                  {result.alreadyAdded ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      In directory
                    </span>
                  ) : null}
                </div>
                <a
                  href={result.normalized ?? result.link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {result.hostname}
                </a>
                {result.snippet ? (
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{result.snippet}</p>
                ) : null}
              </div>
            </div>

            {/* Checkbox indicator */}
            <div className="shrink-0 pt-0.5">
              {result.alreadyAdded ? (
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-100 text-emerald-600">
                  <Check className="h-4 w-4" />
                </div>
              ) : (
                <div
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                    isSelected
                      ? "border-red-500 bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.35)]"
                      : "border-[#d9d1c5] bg-white text-transparent hover:border-red-300"
                  }`}
                >
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
