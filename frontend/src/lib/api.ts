/**
 * Network layer bridging the MedLens frontend to the FastAPI backend.
 *
 * The backend runs at http://localhost:8000 and exposes:
 *   POST /api/upload    -> multipart file upload -> LabResult[]
 *   POST /api/summarize -> JSON { intake?, labs[] } -> { summary }
 */

import type { LabResult, PatientIntake } from "../types/clinical";

/** Base URL of the MedLens FastAPI server. */
export const API_BASE_URL = "";

/**
 * Standard MedLens disclaimer appended by the backend (backend/summarizer.py).
 * Kept here so the UI can render the disclaimer separately from the prose
 * summary returned by GET /api/summarize (which includes it).
 */
export const MEDLENS_DISCLAIMER =
  "Notice: This AI-generated review is for record organization and comprehension only. Consult a licensed healthcare provider for interpretation and diagnosis.";

/** Error thrown for any API failure (network, HTTP status, or bad payload). */
export class ApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const NETWORK_ERROR_MESSAGE = `Unable to reach the MedLens server (${API_BASE_URL}). Please confirm the backend is running and that CORS permits http://localhost:3000.`;

/**
 * Parse a fetch Response into typed JSON, translating HTTP failures into
 * a descriptive ApiError. Prefers the FastAPI `detail` field when present.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body: unknown = await response.json();
      if (
        body &&
        typeof body === "object" &&
        "detail" in body &&
        typeof (body as { detail: unknown }).detail === "string"
      ) {
        detail = (body as { detail: string }).detail;
      }
    } catch {
      // Non-JSON error body; fall back to generic message below.
    }
    throw new ApiError(
      detail ?? `Request failed with status ${response.status} (${response.statusText}).`,
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("The server returned an invalid JSON response.");
  }
}

/** Upload a PDF/TXT clinical document and return the extracted lab results. */
export async function uploadDocument(file: File): Promise<LabResult[]> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });
    return await parseResponse<LabResult[]>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(NETWORK_ERROR_MESSAGE);
  }
}

/**
 * Split the backend's combined summary text into prose + disclaimer.
 *
 * The backend concatenates the disclaimer onto the summary string; when the
 * disclaimer is absent (e.g. an older backend), fall back to the standard one.
 */
function splitSummary(rawSummary: string): { summary: string; disclaimer: string } {
  const index = rawSummary.indexOf(MEDLENS_DISCLAIMER);
  if (index === -1) {
    return { summary: rawSummary, disclaimer: MEDLENS_DISCLAIMER };
  }
  return {
    summary: rawSummary.slice(0, index).trim(),
    disclaimer: rawSummary.slice(index).trim(),
  };
}

/**
 * Generate a non-diagnostic plain-English summary from intake + labs.
 * Returns the prose summary and the standard medical disclaimer separately.
 */
export async function getSummary(
  intake: PatientIntake,
  labs: LabResult[],
): Promise<{ summary: string; disclaimer: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intake, labs }),
    });
    const data = await parseResponse<{ summary: string }>(response);
    return splitSummary(data.summary);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(NETWORK_ERROR_MESSAGE);
  }
}