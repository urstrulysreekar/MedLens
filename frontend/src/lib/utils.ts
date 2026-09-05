/**
 * Shared UI + domain helpers for the MedLens frontend.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { LabResult, PatientIntake, RangeStatus } from "../types/clinical";

/** Merge Tailwind class names, resolving conflicts (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Generate a unique id (prefers the browser's crypto.randomUUID). */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Deterministic reference-range classification.
 * Mirrors backend/evaluator.py evaluate_range().
 */
export function evaluateRange(
  value: number,
  low: number | null,
  high: number | null,
): RangeStatus {
  if (low !== null && value < low) return "low";
  if (high !== null && value > high) return "high";
  if (low !== null && high !== null && low <= value && value <= high) {
    return "normal";
  }
  return "unknown";
}

/** Render a numeric lab value without trailing ".0" noise. */
export function formatValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(2)));
}

/** Render a 0..1 confidence score as a percentage string. */
export function formatConfidence(score: number): string {
  const clamped = Math.max(0, Math.min(1, score));
  return `${Math.round(clamped * 100)}%`;
}

/** Human-readable reference range, e.g. "3.5 – 5.0" or "≥ 3.5". */
export function refRangeDisplay(
  lab: Pick<LabResult, "ref_low" | "ref_high">,
): string {
  if (lab.ref_low !== null && lab.ref_high !== null) {
    return `${formatValue(lab.ref_low)} – ${formatValue(lab.ref_high)}`;
  }
  if (lab.ref_low !== null) return `≥ ${formatValue(lab.ref_low)}`;
  if (lab.ref_high !== null) return `≤ ${formatValue(lab.ref_high)}`;
  return "—";
}

/** Blank intake used before the user fills the form. */
export function emptyPatientIntake(): PatientIntake {
  return {
    age: 0,
    sex: "",
    symptoms: [],
    existing_conditions: [],
    allergies: [],
    current_medications: [],
  };
}

/** Fresh row for the "Add Manual Metric" action. */
export function makeManualLab(): LabResult {
  return {
    id: uuid(),
    test_name: "",
    value: 0,
    unit: "",
    ref_low: null,
    ref_high: null,
    status: "unknown",
    source_snippet: "",
    provenance: "user_entered",
    confidence_score: 1,
  };
}

/** Parse a numeric cell: "" -> null; invalid -> null. */
export function parseNullableNumber(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}