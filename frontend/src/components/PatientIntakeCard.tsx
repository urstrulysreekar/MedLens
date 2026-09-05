"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

import type { PatientIntake } from "../types/clinical";

/** Split a comma-separated string into trimmed, non-empty items. */
function splitItems(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

interface IntakeDraft {
  age: string;
  sex: string;
  symptoms: string;
  allergies: string;
  medications: string;
}

interface PatientIntakeCardProps {
  value: PatientIntake;
  onChange: (intake: PatientIntake) => void;
}

const SEX_OPTIONS = ["", "Female", "Male", "Intersex", "Prefer not to say"];

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200";

/** Section 1: patient intake form. */
export default function PatientIntakeCard({
  value,
  onChange,
}: PatientIntakeCardProps) {
  // Draft state keeps raw strings in the inputs while the lifted PatientIntake
  // stays in sync through onChange.
  const [draft, setDraft] = useState<IntakeDraft>(() => ({
    age: value.age > 0 ? String(value.age) : "",
    sex: value.sex ?? "",
    symptoms: value.symptoms.join(", "),
    allergies: value.allergies.join(", "),
    medications: value.current_medications.join(", "),
  }));

  /** Lift the current draft up as a validated PatientIntake. */
  function update(patch: Partial<IntakeDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    const age = Number.parseInt(next.age, 10);
    onChange({
      age: Number.isFinite(age) && age >= 0 ? age : 0,
      sex: next.sex.trim(),
      symptoms: splitItems(next.symptoms),
      existing_conditions: [],
      allergies: splitItems(next.allergies),
      current_medications: splitItems(next.medications),
    });
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label
          htmlFor="intake-age"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
        >
          <UserRound className="h-4 w-4 text-slate-400" aria-hidden />
          Age
        </label>
        <input
          id="intake-age"
          type="number"
          min={0}
          max={130}
          placeholder="e.g. 57"
          className={inputClass}
          value={draft.age}
          onChange={(e) => update({ age: e.target.value })}
        />
      </div>

      <div>
        <label
          htmlFor="intake-sex"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
        >
          <UserRound className="h-4 w-4 text-slate-400" aria-hidden />
          Biological Sex
        </label>
        <select
          id="intake-sex"
          className={inputClass}
          value={draft.sex}
          onChange={(e) => update({ sex: e.target.value })}
        >
          {SEX_OPTIONS.map((option) => (
            <option key={option} value={option} disabled={option === ""}>
              {option === "" ? "Select…" : option}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label
          htmlFor="intake-symptoms"
          className="block text-sm font-medium text-slate-700"
        >
          Symptoms
        </label>
        <input
          id="intake-symptoms"
          type="text"
          placeholder="e.g. fatigue, shortness of breath, dizziness"
          className={inputClass}
          value={draft.symptoms}
          onChange={(e) => update({ symptoms: e.target.value })}
        />
        <p className="mt-1 text-xs text-slate-400">
          Comma-separated list.
        </p>
      </div>

      <div>
        <label
          htmlFor="intake-allergies"
          className="block text-sm font-medium text-slate-700"
        >
          Allergies
        </label>
        <input
          id="intake-allergies"
          type="text"
          placeholder="e.g. penicillin, sulfa"
          className={inputClass}
          value={draft.allergies}
          onChange={(e) => update({ allergies: e.target.value })}
        />
      </div>

      <div>
        <label
          htmlFor="intake-medications"
          className="block text-sm font-medium text-slate-700"
        >
          Current Medications
        </label>
        <input
          id="intake-medications"
          type="text"
          placeholder="e.g. lisinopril, metformin"
          className={inputClass}
          value={draft.medications}
          onChange={(e) => update({ medications: e.target.value })}
        />
        <p className="mt-1 text-xs text-slate-400">
          Comma-separated list.
        </p>
      </div>
    </div>
  );
}