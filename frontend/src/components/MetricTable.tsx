"use client";

import { useRef } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import type { LabResult, ProvenanceType } from "../types/clinical";
import { isOutOfRange } from "../types/clinical";
import {
  cn,
  evaluateRange,
  formatConfidence,
  makeManualLab,
  parseNullableNumber,
  refRangeDisplay,
} from "../lib/utils";
import StatusBadge from "./StatusBadge";

interface MetricTableProps {
  labs: LabResult[];
  onLabsChange: (labs: LabResult[]) => void;
}

const cellInputClass =
  "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-slate-800 transition-colors hover:border-slate-200 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-200";

/** Provenance tag: [AI Extracted · 95%] / [User Edited] / [User Entered]. */
function ProvenanceTag({ lab }: { lab: LabResult }) {
  const tag: Record<
    ProvenanceType,
    { label: string; className: string; dot: string }
  > = {
    ai_extracted: {
      label: `AI Extracted · ${formatConfidence(lab.confidence_score)}`,
      className: "bg-teal-50 text-teal-700 ring-teal-200",
      dot: "bg-teal-500",
    },
    user_edited: {
      label: "User Edited",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      dot: "bg-amber-500",
    },
    user_entered: {
      label: "User Entered",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
      dot: "bg-slate-400",
    },
  };
  const t = tag[lab.provenance];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        t.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden />
      {t.label}
    </span>
  );
}

/** Section 3 (right pane): editable clinical metric table. */
export default function MetricTable({
  labs,
  onLabsChange,
}: MetricTableProps) {
  const valueRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /** Apply an inline edit: recompute status + flip provenance to user_edited. */
  function applyEdit(
    id: string,
    patch: Partial<LabResult>,
    numeric?: { value?: number; refLow?: number | null; refHigh?: number | null },
  ) {
    const target = labs.find((lab) => lab.id === id);
    if (!target) return;
    const nextValue = numeric?.value ?? (patch.value ?? target.value);
    const nextLow =
      numeric?.refLow !== undefined
        ? numeric.refLow
        : (patch.ref_low !== undefined ? patch.ref_low : target.ref_low);
    const nextHigh =
      numeric?.refHigh !== undefined
        ? numeric.refHigh
        : (patch.ref_high !== undefined ? patch.ref_high : target.ref_high);
    onLabsChange(
      labs.map((lab) =>
        lab.id === id
          ? {
              ...lab,
              ...patch,
              value: nextValue,
              ref_low: nextLow,
              ref_high: nextHigh,
              status: evaluateRange(nextValue, nextLow, nextHigh),
              provenance: "user_edited" as const,
            }
          : lab,
      ),
    );
  }

  function addManualMetric() {
    onLabsChange([...labs, makeManualLab()]);
  }

  function deleteRow(id: string) {
    onLabsChange(labs.filter((lab) => lab.id !== id));
  }

  const outOfRangeCount = labs.filter((lab) => isOutOfRange(lab.status)).length;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5 font-semibold">Test Name</th>
              <th className="px-3 py-2.5 font-semibold">Value</th>
              <th className="px-3 py-2.5 font-semibold">Unit</th>
              <th className="px-3 py-2.5 font-semibold">
                Source Reference Range
              </th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Provenance</th>
              <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {labs.map((lab) => (
              <tr
                key={lab.id}
                className={cn(
                  "border-b border-slate-100 transition-colors last:border-b-0",
                  isOutOfRange(lab.status)
                    ? "bg-red-50/40 hover:bg-red-50/70"
                    : "hover:bg-slate-50",
                )}
              >
                <td className="px-2 py-1.5 align-middle">
                  <input
                    type="text"
                    className={cn(cellInputClass, "min-w-[120px] font-medium")}
                    value={lab.test_name}
                    placeholder="Untitled test"
                    onChange={(e) =>
                      applyEdit(lab.id, { test_name: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <input
                    ref={(el) => {
                      valueRefs.current[lab.id] = el;
                    }}
                    type="text"
                    inputMode="decimal"
                    className={cn(cellInputClass, "min-w-[64px]")}
                    value={String(lab.value)}
                    onChange={(e) => {
                      const parsed = parseNullableNumber(e.target.value);
                      if (parsed !== null) {
                        applyEdit(lab.id, {}, { value: parsed });
                      }
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <input
                    type="text"
                    className={cn(cellInputClass, "min-w-[72px]")}
                    value={lab.unit}
                    placeholder="—"
                    onChange={(e) =>
                      applyEdit(lab.id, { unit: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-1.5 align-middle">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      className={cn(cellInputClass, "w-14 text-center")}
                      value={lab.ref_low !== null ? String(lab.ref_low) : ""}
                      placeholder="—"
                      aria-label={`Reference low for ${lab.test_name || "test"}`}
                      onChange={(e) =>
                        applyEdit(lab.id, {}, { refLow: parseNullableNumber(e.target.value) })
                      }
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={cn(cellInputClass, "w-14 text-center")}
                      value={lab.ref_high !== null ? String(lab.ref_high) : ""}
                      placeholder="—"
                      aria-label={`Reference high for ${lab.test_name || "test"}`}
                      onChange={(e) =>
                        applyEdit(lab.id, {}, { refHigh: parseNullableNumber(e.target.value) })
                      }
                    />
                  </div>
                  <p className="px-1.5 text-[11px] text-slate-400">
                    {refRangeDisplay(lab)}
                  </p>
                </td>
                <td className="px-3 py-1.5 align-middle">
                  <StatusBadge status={lab.status} />
                </td>
                <td className="px-3 py-1.5 align-middle">
                  <ProvenanceTag lab={lab} />
                </td>
                <td className="px-3 py-1.5 align-middle">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title="Edit (focus value)"
                      aria-label={`Edit ${lab.test_name || "test"}`}
                      onClick={() => valueRefs.current[lab.id]?.focus()}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-teal-50 hover:text-teal-700"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label={`Delete ${lab.test_name || "test"}`}
                      onClick={() => deleteRow(lab.id)}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {labs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No lab metrics yet. Upload a document or add a manual metric
                  below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3">
        <button
          type="button"
          onClick={addManualMetric}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Manual Metric
        </button>
        {labs.length > 0 && (
          <p className="text-xs text-slate-400">
            {labs.length} metric{labs.length === 1 ? "" : "s"} ·{" "}
            <span
              className={cn(
                "font-semibold",
                outOfRangeCount > 0 ? "text-red-600" : "text-slate-500",
              )}
            >
              {outOfRangeCount} out of range
            </span>
          </p>
        )}
      </div>
    </div>
  );
}