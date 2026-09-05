"use client";

import { ClipboardList, FileText } from "lucide-react";

import type { LabResult } from "../types/clinical";

interface SourcePaneProps {
  rawText: string | null;
  labs: LabResult[];
  fileName: string | null;
}

/**
 * Section 3 (left pane): extracted raw source view.
 * Shows the original document text for TXT uploads; for PDFs (parsed
 * server-side) it falls back to the verbatim snippets from the extraction.
 */
export default function SourcePane({ rawText, labs, fileName }: SourcePaneProps) {
  const snippetText = labs
    .map((lab) => lab.source_snippet)
    .filter((s) => s && s.trim().length > 0)
    .join("\n");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-100/70 px-4 py-2.5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <ClipboardList className="h-4 w-4" aria-hidden />
          Extracted Raw Source
        </p>
        {fileName ? (
          <span className="flex max-w-[220px] items-center gap-1.5 truncate text-xs text-slate-400">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{fileName}</span>
          </span>
        ) : null}
      </div>

      <div className="min-h-[280px] flex-1 overflow-auto p-4 lg:max-h-full">
        {rawText ? (
          <>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700">
              {rawText}
            </pre>
            <p className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-400">
              Raw text read directly from the uploaded file.
            </p>
          </>
        ) : snippetText ? (
          <>
            <ul className="space-y-3">
              {labs
                .filter((lab) => lab.source_snippet && lab.source_snippet.trim())
                .map((lab) => (
                  <li key={lab.id}>
                    <span className="block rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-700">
                      “{lab.source_snippet}”
                    </span>
                  </li>
                ))}
            </ul>
            <p className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-400">
              Verbatim source snippets returned by the AI extraction. For full
              raw text on PDFs, upload a TXT file.
            </p>
          </>
        ) : (
          <p className="flex h-full min-h-[240px] items-center justify-center text-center text-sm text-slate-400">
            Upload a document to see the extracted raw source here.
          </p>
        )}
      </div>
    </div>
  );
}