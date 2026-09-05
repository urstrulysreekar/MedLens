"""MedLens end-to-end verification script.

Runs the real FastAPI application (``backend/main.py``) in-process via the
ASGI ``TestClient`` — no sockets required — and verifies the complete
document -> extraction -> classification -> summary flow:

  1. GET  /health            returns ``{"status": "healthy"}``.
  2. POST /api/upload        with ``sample_data/sample_cbc.txt`` returns
     correctly range-classified LabResults:
       - WBC        14.5 (Ref 4.5  - 11.0) -> high
       - Hemoglobin 10.8 (Ref 12.0 - 15.5) -> low
       - RBC         4.20 (Ref 4.00 - 5.20) -> normal
       - Ferritin    32   (Ref Not Stated)   -> unknown
  3. POST /api/summarize     with those labs + patient intake returns text
     containing the standard medical disclaimer while avoiding diagnostic
     language ("diagnosed", "prescribed").

The OpenRouter/OpenAI chat call is MOCKED by default so the suite runs
offline, deterministically, and without an API key. To exercise the real
LLM instead, set ``MEDLENS_E2E_LIVE=1`` and put a working
``OPENROUTER_API_KEY`` into ``backend/.env``.

Exit code is 0 only when every check passes.
"""

import json
import os
import sys
import types
from contextlib import ExitStack
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from dotenv import load_dotenv

load_dotenv(os.path.join(HERE, ".env"))

from fastapi.testclient import TestClient

from main import app

LIVE = os.getenv("MEDLENS_E2E_LIVE") == "1"
CBC_PATH = os.path.join(HERE, "sample_data", "sample_cbc.txt")

DISCLAIMER = (
    "Notice: This AI-generated review is for record organization and "
    "comprehension only. Consult a licensed healthcare provider for "
    "interpretation and diagnosis."
)

FORBIDDEN_WORDS = ("diagnosed", "prescribed")

# --- Fake LLM responses (used unless MEDLENS_E2E_LIVE=1) ------------------
CBC_LLM_JSON = {
    "lab_results": [
        {
            "test_name": "WBC",
            "value": 14.5,
            "unit": "x10^3/uL",
            "ref_low": 4.5,
            "ref_high": 11.0,
            "source_snippet": "WBC: 14.5 x10^3/uL       (Ref: 4.5 - 11.0)",
        },
        {
            "test_name": "RBC",
            "value": 4.20,
            "unit": "x10^6/uL",
            "ref_low": 4.00,
            "ref_high": 5.20,
            "source_snippet": "RBC: 4.20 x10^6/uL       (Ref: 4.00 - 5.20)",
        },
        {
            "test_name": "Hemoglobin",
            "value": 10.8,
            "unit": "g/dL",
            "ref_low": 12.0,
            "ref_high": 15.5,
            "source_snippet": "Hemoglobin: 10.8 g/dL    (Ref: 12.0 - 15.5)",
        },
        {
            "test_name": "Platelets",
            "value": 210,
            "unit": "x10^3/uL",
            "ref_low": 150,
            "ref_high": 450,
            "source_snippet": "Platelets: 210 x10^3/uL  (Ref: 150 - 450)",
        },
        {
            "test_name": "Ferritin",
            "value": 32,
            "unit": "ng/mL",
            "ref_low": None,
            "ref_high": None,
            "source_snippet": "Ferritin: 32 ng/mL       (Ref: Not Stated)",
        },
    ]
}

SUMMARY_PROSE = (
    "Your reported CBC shows a high white blood cell count and a low "
    "hemoglobin reading; red blood cells and platelets are within the "
    "printed ranges. This summary is for informational organization only."
)


def _make_response(content: str):
    return types.SimpleNamespace(
        choices=[
            types.SimpleNamespace(message=types.SimpleNamespace(content=content))
        ]
    )


class FakeCompletions:
    """Records each chat call and returns the canned extraction/summary."""

    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        system = kwargs["messages"][0]["content"]
        if "Extract all laboratory test results" in system:
            return _make_response(json.dumps(CBC_LLM_JSON))
        return _make_response(SUMMARY_PROSE)


class FakeChat:
    def __init__(self):
        self.completions = FakeCompletions()


class FakeClient:
    def __init__(self):
        self.chat = FakeChat()


# --- Tiny check harness ----------------------------------------------------
_passed = 0
_failed = 0


def check(condition: bool, label: str):
    global _passed, _failed
    if condition:
        _passed += 1
        print(f"  [PASS] {label}")
    else:
        _failed += 1
        print(f"  [FAIL] {label}")


def main() -> int:
    global _passed, _failed
    print("=" * 72)
    print("MedLens end-to-end verification")
    print(
        "mode:",
        "LIVE (real OpenRouter LLM)" if LIVE else "MOCKED (offline, deterministic)",
    )
    print("=" * 72)

    if not os.path.exists(CBC_PATH):
        print(f"\nFixture not found: {CBC_PATH}")
        return 1

    fake = FakeClient() if not LIVE else None
    with ExitStack() as stack:
        if not LIVE:
            # Patch the client at both import sites: extractor stores it as a
            # module global, while summarizer holds a direct function reference.
            stack.enter_context(
                mock.patch("extractor.get_llm_client", return_value=fake)
            )
            stack.enter_context(
                mock.patch("summarizer.get_llm_client", return_value=fake)
            )
        with TestClient(app) as client:
            # ---- 1. Health -------------------------------------------------
            r = client.get("/health")
            check(r.status_code == 200, "GET /health returns 200")
            check(
                r.json() == {"status": "healthy"},
                "GET /health body is {'status': 'healthy'}",
            )

            # ---- 2. Upload sample CBC --------------------------------------
            with open(CBC_PATH, "rb") as fh:
                r = client.post(
                    "/api/upload",
                    files={"file": ("sample_cbc.txt", fh, "text/plain")},
                )
            check(r.status_code == 200, "POST /api/upload returns 200")
            labs = r.json()
            check(len(labs) == 5, f"extracted 5 lab results (got {len(labs)})")

            by_name = {lab["test_name"].lower(): lab for lab in labs}
            expected = {
                "wbc": "high",
                "hemoglobin": "low",
                "rbc": "normal",
                "ferritin": "unknown",
                "platelets": "normal",
            }
            for name, want in expected.items():
                lab = by_name.get(name)
                if lab is None:
                    check(False, f"{name} present in extraction")
                    continue
                check(
                    lab["status"] == want,
                    f"{name} = {lab['value']} classified '{lab['status']}' "
                    f"(expected '{want}')",
                )

            print("\n  Uploaded extraction summary:")
            for lab in labs:
                print(
                    f"    - {lab['test_name']:<12} {lab['value']:<7} "
                    f"{lab['unit']:<10} {lab['status']}"
                )

            # ---- 3. Summarize ----------------------------------------------
            intake = {
                "age": 42,
                "sex": "Female",
                "symptoms": ["fatigue", "fever"],
                "existing_conditions": [],
                "allergies": ["penicillin"],
                "current_medications": ["ibuprofen"],
            }
            r = client.post("/api/summarize", json={"intake": intake, "labs": labs})
            check(r.status_code == 200, "POST /api/summarize returns 200")
            body = r.json()
            text = body.get("summary", "")
            check(len(text) > 0, "summary text is non-empty")

            check(
                DISCLAIMER in text,
                "summary contains the standard medical disclaimer",
            )
            lowered = text.lower()
            for word in FORBIDDEN_WORDS:
                check(word not in lowered, f"summary avoids '{word}'")

            if not LIVE and fake is not None:
                summarize_calls = [
                    c
                    for c in fake.chat.completions.calls
                    if "Extract all laboratory test results"
                    not in c["messages"][0]["content"]
                ]
                check(len(summarize_calls) >= 1, "summarizer invoked the LLM")
                if summarize_calls:
                    system_prompt = summarize_calls[0]["messages"][0]["content"]
                    check(
                        "Do not provide clinical diagnoses" in system_prompt,
                        "summarizer guardrail: no clinical diagnoses in system prompt",
                    )
                    check(
                        "do not recommend medications or dosages" in system_prompt,
                        "summarizer guardrail: no medication/dosage recommendations",
                    )
                    user_prompt = summarize_calls[0]["messages"][1]["content"]
                    check(
                        "fatigue, fever" in user_prompt,
                        "intake symptoms passed to summary",
                    )
                    check("Age: 42" in user_prompt, "patient age passed to summary")

            # ---- 4. Unsupported file type ----------------------------------
            r = client.post(
                "/api/upload",
                files={
                    "file": ("notes.docx", b"%PDF", "application/octet-stream"),
                },
            )
            check(
                r.status_code == 415,
                "POST /api/upload rejects non PDF/TXT (415)",
            )

    print("\n" + "=" * 72)
    print(f"RESULT: {_passed} passed, {_failed} failed")
    if _failed == 0:
        print("ALL E2E CHECKS PASSED")
    else:
        print("E2E VERIFICATION FAILED")
    print("=" * 72)
    return 1 if _failed else 0


if __name__ == "__main__":
    raise SystemExit(main())