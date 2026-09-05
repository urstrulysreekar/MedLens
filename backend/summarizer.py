"""Plain-English, non-diagnostic clinical summary generation."""

from typing import List, Optional

from extractor import get_llm_client, get_llm_model
from models import LabResult, PatientIntake, RangeStatus

DISCLAIMER = (
    "Notice: This AI-generated review is for record organization and "
    "comprehension only. Consult a licensed healthcare provider for "
    "interpretation and diagnosis."
)

SYSTEM_PROMPT = (
    "Generate a plain-English, easily digestible synthesis of the extracted "
    "clinical information. Emphasize out-of-range markers. ABSOLUTE "
    "GUARDRAILS: Do not provide clinical diagnoses, do not recommend "
    "medications or dosages, and clearly state that this summary is for "
    "informational organization only."
)


def _format_ref_range(lab: LabResult) -> str:
    """Human-readable reference range for a lab result."""
    if lab.ref_low is not None and lab.ref_high is not None:
        return f"{lab.ref_low} - {lab.ref_high}"
    if lab.ref_low is not None:
        return f">= {lab.ref_low}"
    if lab.ref_high is not None:
        return f"<= {lab.ref_high}"
    return ""


def _format_out_of_range(labs: List[LabResult]) -> str:
    abnormal = [
        f"{lab.test_name} {lab.value} {lab.unit} ({lab.status.value})"
        for lab in labs
        if lab.status in (RangeStatus.LOW, RangeStatus.HIGH)
    ]
    if not abnormal:
        return (
            "All extracted lab values fall within their printed reference "
            "ranges, or no reference range was printed for comparison."
        )
    return (
        "The following values fall outside the printed reference ranges:\n- "
        + "\n- ".join(abnormal)
    )


def _format_labs(labs: List[LabResult]) -> str:
    if not labs:
        return "No laboratory results were extracted."
    lines = []
    for lab in labs:
        ref_text = _format_ref_range(lab)
        ref_part = f" (ref: {ref_text})" if ref_text else " (no printed range)"
        flag = {
            RangeStatus.LOW: " [LOW]",
            RangeStatus.HIGH: " [HIGH]",
            RangeStatus.NORMAL: " [normal]",
            RangeStatus.UNKNOWN: "",
        }.get(lab.status, "")
        snippet = f'  - source: "{lab.source_snippet}"' if lab.source_snippet else ""
        lines.append(
            f"- {lab.test_name}: {lab.value} {lab.unit}{ref_part}{flag}\n{snippet}".rstrip()
        )
    return "\n".join(lines)


def generate_patient_summary(
    intake: Optional[PatientIntake],
    labs: List[LabResult],
) -> str:
    """Generate a plain-English, non-diagnostic summary of intake + labs.

    The LLM result has the standard MedLens disclaimer appended to it.
    """
    sections: List[str] = []
    if intake is not None:
        sections.append(
            "PATIENT CONTEXT\n"
            f"- Age: {intake.age}\n"
            f"- Sex: {intake.sex}\n"
            f"- Reported symptoms: {', '.join(intake.symptoms) or 'none reported'}\n"
            f"- Existing conditions: {', '.join(intake.existing_conditions) or 'none reported'}\n"
            f"- Allergies: {', '.join(intake.allergies) or 'none reported'}\n"
            f"- Current medications: {', '.join(intake.current_medications) or 'none reported'}"
        )
    else:
        sections.append("PATIENT CONTEXT\n- No intake information was provided.")
    sections.append("LABORATORY RESULTS\n" + _format_labs(labs))
    sections.append("OUT-OF-RANGE VALUES\n" + _format_out_of_range(labs))

    user_prompt = "\n\n".join(sections)

    client = get_llm_client()
    response = client.chat.completions.create(
        model=get_llm_model(),
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
    )
    summary = (response.choices[0].message.content or "").strip()
    if not summary:
        summary = "No summary was generated."
    return f"{summary}\n\n{DISCLAIMER}"