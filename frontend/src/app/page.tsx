"use client";

import { useState } from "react";

import Header from "../components/Header";
import SectionCard from "../components/SectionCard";
import PatientIntakeCard from "../components/PatientIntakeCard";
import DocumentDropzone from "../components/DocumentDropzone";
import SourcePane from "../components/SourcePane";
import MetricTable from "../components/MetricTable";
import SummaryPanel from "../components/SummaryPanel";
import { ApiError, getSummary, MEDLENS_DISCLAIMER, uploadDocument } from "../lib/api";
import { emptyPatientIntake } from "../lib/utils";
import type { LabResult, PatientIntake } from "../types/clinical";

export default function Home() {
  const [intake, setIntake] = useState<PatientIntake>(() => emptyPatientIntake());
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [rawText, setRawText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [disclaimer, setDisclaimer] = useState(MEDLENS_DISCLAIMER);

  async function handleFile(file: File) {
    setUploadError(null);
    setSummarizing(false);
    setSummary("");
    setSummaryError(null);
    setUploading(true);
    try {
      if (file.name.toLowerCase().endsWith(".txt")) {
        setRawText(await file.text());
      } else {
        // PDF text is extracted server-side; verified later via snippets.
        setRawText(null);
      }
      setFileName(file.name);
      const result = await uploadDocument(file);
      setLabs(result);
    } catch (error) {
      setLabs([]);
      setRawText(null);
      setFileName(null);
      setUploadError(
        error instanceof ApiError
          ? error.message
          : "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerateSummary() {
    setSummaryError(null);
    setSummarizing(true);
    try {
      const result = await getSummary(intake, labs);
      setSummary(result.summary);
      setDisclaimer(result.disclaimer);
    } catch (error) {
      setSummary("");
      setSummaryError(
        error instanceof ApiError
          ? error.message
          : "Summary generation failed. Please try again.",
      );
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Clinical Document Review
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
            Upload a lab report, verify the AI-extracted metrics, and generate
            a non-diagnostic briefing for record organization.
          </p>
        </div>

        {/* Step 1 — Patient Intake */}
        <SectionCard
          step="1"
          title="Patient Intake"
          subtitle="Optional context used to tailor the AI briefing."
        >
          <PatientIntakeCard value={intake} onChange={setIntake} />
        </SectionCard>

        {/* Step 2 — Document Ingestion */}
        <SectionCard
          step="2"
          title="Document Ingestion"
          subtitle="Drop a PDF or TXT lab report — extraction runs immediately."
        >
          <DocumentDropzone
            onFile={handleFile}
            busy={uploading}
            fileName={fileName}
            error={uploadError}
          />
        </SectionCard>

        {/* Step 3 — Split-Pane Verification */}
        <SectionCard
          step="3"
          title="Verification"
          subtitle="Compare the extracted raw source against editable metrics."
        >
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <div className="lg:max-h-[520px]">
              <SourcePane rawText={rawText} labs={labs} fileName={fileName} />
            </div>
            <MetricTable labs={labs} onLabsChange={setLabs} />
          </div>
        </SectionCard>

        {/* Step 4 — AI Record Briefing */}
        <SectionCard
          step="4"
          title="AI Record Briefing"
          subtitle="Plain-English synthesis with out-of-range markers."
        >
          <SummaryPanel
            disabled={labs.length === 0}
            loading={summarizing}
            error={summaryError}
            summary={summary}
            disclaimer={disclaimer}
            onGenerate={handleGenerateSummary}
          />
        </SectionCard>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-400">
            MedLens — AI Clinical Document Intelligence. Non-diagnostic decision
            support only. Always consult a licensed healthcare provider.
          </p>
        </div>
      </footer>
    </div>
  );
}