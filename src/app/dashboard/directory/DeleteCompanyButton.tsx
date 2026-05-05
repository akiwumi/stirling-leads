"use client";

import { Trash2 } from "lucide-react";
import { deleteCompany } from "../actions";

export function DeleteCompanyButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  function handleSubmit(e: React.FormEvent) {
    if (!confirm(`Delete "${companyName}"? This will permanently remove all contacts, notes, and data for this company.`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={deleteCompany} onSubmit={handleSubmit}>
      <input type="hidden" name="companyId" value={companyId} />
      <button
        type="submit"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-500"
        title="Delete company"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
