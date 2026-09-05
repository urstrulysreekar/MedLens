"use client";

import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

interface SummaryPanelProps {
  disabled: boolean;
  loading: boolean;
  error: string | null;
  summary: string;
  disclaimer: string;
  onGenerate: () => void;
}

/** Section 4: AI record briefing with disclaimer banner. */
export default function SummaryPanel({
  disabled,
  loading,
  error,
  summary,
  disclaimer,
  onGenerate,
}: SummaryPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-slate-500">
          Reviews the extracted clinical metrics and patient intake to build a
          plain-English, non-diagnostic briefing with out-of-range markers.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          {loading ? "Generating…" : "Generate Patient Summary"}
        </button>
      </div>

      {error && (
        <p
          role="status"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {disabled && !loading && !summary && (
        <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center text-sm text-slate-400">
          Add lab metrics first (upload a document or add a manual metric),
          then generate the briefing.
        </div>
      )}

      {!disabled && loading && (
        <div className="flex min-h-[140px] animate-pulse items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-400">
          Synthesizing clinical information…
        </div>
      )}

      {summary && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-teal-600" aria-hidden />
              AI Record Briefing
            </h3>
          </div>
          <div className="px-5 py-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {summary}
            </p>
          </div>
          {disclaimer && (
            <div className="flex items-start gap-3 rounded-b-xl border-t border-amber-200 bg-amber-50 px-5 py-3.5">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden
              />
              <p className="text-xs leading-relaxed text-amber-800">
                {disclaimer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}