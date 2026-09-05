import { Activity, ShieldAlert } from "lucide-react";

/**
 * Page header with MedLens branding and a persistent (sticky) clinical
 * safety banner. The banner stays visible while scrolling.
 */
export default function Header() {
  return (
    <>
      <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <p className="text-xs font-semibold tracking-wide text-amber-900 sm:text-sm">
            AI Clinical Document Intelligence — Non-Diagnostic Decision Support
            Only
          </p>
        </div>
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm">
              <Activity className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-lg leading-tight font-bold tracking-tight text-slate-900">
                Med<span className="text-teal-600">Lens</span>
              </p>
              <p className="text-xs text-slate-500">
                AI Clinical Document Intelligence
              </p>
            </div>
          </div>
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 sm:inline-block">
            FastAPI · OpenRouter · pypdf
          </span>
        </div>
      </header>
    </>
  );
}