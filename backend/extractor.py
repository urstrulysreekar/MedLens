"""LLM-powered extraction of laboratory results from clinical documents.

Connects to OpenRouter via the OpenAI-compatible SDK using credentials from
``.env`` (``OPENROUTER_API_KEY``, ``LLM_BASE_URL``, ``LLM_MODEL``). The LLM is
instructed to return strictly JSON, and every extracted value is then run
through the deterministic ``evaluator.evaluate_range`` so the ``status`` field
is *never* decided by the model.
"""

import io
import json
import os
import re
from typing import Any, Dict, List, Optional

import pypdf
from dotenv import load_dotenv
from openai import OpenAI

from evaluator import evaluate_range
from models import LabResult

load_dotenv()

DEFAULT_MODEL = "z-ai/glm-5.3-flash"
DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

SYSTEM_PROMPT = (
    "Extract all laboratory test results strictly as JSON. Extract test_name, "
    "numeric value, unit, reference low bound, reference high bound, and "
    "verbatim source_snippet. If no reference range is printed on the page, "
    "set ref_low and ref_high to null. DO NOT hallucinate standard clinical "
    "reference ranges. Return the object {\"lab_results\": [...]}."
)


def get_llm_client() -> OpenAI:
    """Build an OpenAI-compatible client configured for OpenRouter."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key.strip() == "" or api_key.strip() == "your_key_here":
        raise RuntimeError(
            "OPENROUTER_API_KEY is not configured. Add a real key to backend/.env"
        )
    base_url = os.getenv("LLM_BASE_URL", DEFAULT_BASE_URL)
    return OpenAI(api_key=api_key.strip(), base_url=base_url, timeout=90)


def get_llm_model() -> str:
    """Return the configured LLM model id, falling back to the default."""
    return os.getenv("LLM_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF document supplied as raw bytes."""
    if not file_bytes:
        return ""
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    except Exception as exc:  # noqa: BLE001 - surface a readable message
        raise ValueError(f"Could not parse PDF: {exc}") from exc
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:  # noqa: BLE001 - one bad page must not kill the run
            pages.append("")
    return "\n\n".join(p.strip() for p in pages if p and p.strip())


def _parse_model_json(content: str) -> List[Dict[str, Any]]:
    """Convert an LLM JSON response into a list of raw lab dicts.

    Tolerates markdown fences, a top-level ``{"lab_results": [...]}`` wrapper,
    a bare array, or a single flat lab object.
    """
    if not content:
        return []
    cleaned = content.strip()
    # Strip ```json ... ``` fences if the model wrapped its output.
    fence = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", cleaned, flags=re.DOTALL)
    if fence:
        cleaned = fence.group(1).strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Last resort: carve out the first JSON object / array via regex.
        data = None
        for candidate in re.findall(r"[\{\[].*?[\}\]]", cleaned, flags=re.DOTALL):
            try:
                data = json.loads(candidate)
                break
            except json.JSONDecodeError:
                continue
        if data is None:
            return []
    if isinstance(data, dict):
        for key in ("lab_results", "results", "labs", "labResults"):
            nested = data.get(key)
            if isinstance(nested, list):
                return nested
        return [data] if "test_name" in data else []
    if isinstance(data, list):
        return data
    return []


def _coerce_float(value: Any) -> Optional[float]:
    """Coerce a raw LLM value into a float, returning None when unusable."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text or text.lower() in {"null", "none", "n/a", "na", "--", "-"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _build_lab_result(raw: Dict[str, Any]) -> Optional[LabResult]:
    """Build a validated :class:`LabResult` from one raw LLM dict."""
    if not isinstance(raw, dict):
        return None
    test_name = str(raw.get("test_name", "") or "").strip()
    value = _coerce_float(raw.get("value"))
    if not test_name or value is None:
        return None
    unit = str(raw.get("unit", "") or "").strip()
    source_snippet = str(raw.get("source_snippet", "") or "").strip()
    ref_low = _coerce_float(raw.get("ref_low"))
    ref_high = _coerce_float(raw.get("ref_high"))
    lab = LabResult(
        test_name=test_name,
        value=value,
        unit=unit,
        ref_low=ref_low,
        ref_high=ref_high,
        source_snippet=source_snippet,
    )
    # Deterministic status assignment - the model never decides this.
    lab.status = evaluate_range(lab.value, lab.ref_low, lab.ref_high)
    return lab


def extract_lab_data(text: str) -> List[LabResult]:
    """Run LLM extraction over clinical ``text`` and return lab results.

    The LLM returns JSON; each result is coerced into a :class:`LabResult`
    and its ``status`` is assigned by ``evaluator.evaluate_range``.
    """
    if not text or not text.strip():
        return []
    client = get_llm_client()
    response = client.chat.completions.create(
        model=get_llm_model(),
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text.strip()},
        ],
        temperature=0.0,
        response_format={"type": "json_object"},
    )
    content = response.choices[0].message.content
    labs: List[LabResult] = []
    for raw in _parse_model_json(content):
        lab = _build_lab_result(raw)
        if lab is not None:
            labs.append(lab)
    return labs