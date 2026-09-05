"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";

import { cn } from "../lib/utils";

interface DocumentDropzoneProps {
  onFile: (file: File) => void;
  busy?: boolean;
  fileName?: string | null;
  error?: string | null;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".txt"];

function isAccepted(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/** Section 2: drag-and-drop / browse dropzone for PDF & TXT files. */
export default function DocumentDropzone({
  onFile,
  busy = false,
  fileName = null,
  error = null,
}: DocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!isAccepted(file)) {
        setLocalError("Only PDF or TXT files are supported.");
        return;
      }
      setLocalError(null);
      onFile(file);
    },
    [onFile],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a PDF or TXT lab document"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-teal-500 bg-teal-50"
            : "border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/50",
          busy && "cursor-wait opacity-60",
        )}
      >
        {busy ? (
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden />
        ) : fileName ? (
          <FileText className="h-8 w-8 text-teal-600" aria-hidden />
        ) : (
          <UploadCloud className="h-8 w-8 text-slate-400" aria-hidden />
        )}
        <div>
          {busy ? (
            <p className="text-sm font-medium text-slate-700">
              Uploading and extracting lab data…
            </p>
          ) : fileName ? (
            <>
              <p className="text-sm font-medium text-slate-800">
                <span className="font-semibold">{fileName}</span> loaded
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Drop a new file or click to replace it.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">
                Drag &amp; drop a PDF or text file here
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                …or click to browse · PDF / TXT · max 20 MB
              </p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(error ?? localError) && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error ?? localError}
        </p>
      )}
    </div>
  );
}