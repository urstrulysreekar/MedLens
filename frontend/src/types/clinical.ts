/**
 * TypeScript mirrors of the backend Pydantic models (backend/models.py).
 *
 * Keep these in sync with the FastAPI OpenAPI schema; the backend uses
 * camelCase-style snake_case JSON keys, so field names below match the
 * wire format exactly.
 */

/**
 * Classification of a lab value relative to its reference range.
 * Matches backend RangeStatus enum values.
 */
export type RangeStatus = "low" | "normal" | "high" | "unknown";

/**
 * Where a piece of clinical data came from.
 * Matches backend ProvenanceType enum values.
 */
export type ProvenanceType = "user_entered" | "ai_extracted" | "user_edited";

/**
 * A single laboratory result extracted from a clinical document.
 * Mirrors backend `LabResult`.
 */
export interface LabResult {
  id: string;
  test_name: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  status: RangeStatus;
  source_snippet: string;
  provenance: ProvenanceType;
  confidence_score: number;
}

/**
 * Demographic and clinical context submitted for a report.
 * Mirrors backend `PatientIntake`.
 */
export interface PatientIntake {
  age: number;
  sex: string;
  symptoms: string[];
  existing_conditions: string[];
  allergies: string[];
  current_medications: string[];
}

/**
 * Full analysis response returned to the user.
 * Mirrors backend `ClinicalReportResponse`.
 */
export interface ClinicalReportResponse {
  patient: PatientIntake | null;
  lab_results: LabResult[];
  summary: string;
  disclaimer: string;
}

/** Human-readable helper for flagging out-of-range results. */
export function isOutOfRange(status: RangeStatus): boolean {
  return status === "low" || status === "high";
}