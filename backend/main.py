"""FastAPI application for the MedLens clinical document platform."""

from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from extractor import extract_lab_data, extract_text_from_pdf
from models import LabResult, PatientIntake
from summarizer import generate_patient_summary

app = FastAPI(
    title="MedLens API",
    description="AI clinical document processing platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB safety cap


class SummarizeRequest(BaseModel):
    intake: Optional[PatientIntake] = None
    labs: List[LabResult] = Field(default_factory=list)


class SummarizeResponse(BaseModel):
    summary: str


@app.get("/health")
def health() -> dict:
    return {"status": "healthy"}


@app.post("/api/upload", response_model=List[LabResult])
async def upload_document(file: UploadFile = File(...)) -> List[LabResult]:
    """Accept a PDF or TXT lab document and return extracted lab results."""
    filename = (file.filename or "").lower()
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 20 MB)")
    content_type = (file.content_type or "").lower()
    # Extension-driven detection; MIME type only matters when the filename
    # carries no useful extension (e.g. some client uploads).
    is_pdf = filename.endswith(".pdf") or (
        not filename and content_type == "application/pdf"
    )
    is_txt = filename.endswith(".txt") or (
        not filename and content_type in {"text/plain", "text/markdown"}
    )
    if is_pdf:
        text = extract_text_from_pdf(contents)
        if not text:
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")
    elif is_txt:
        text = contents.decode("utf-8", errors="replace")
        if not text.strip():
            raise HTTPException(status_code=400, detail="TXT file is empty")
    else:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Upload a PDF or TXT file.",
        )
    try:
        return extract_lab_data(text)
    except Exception as exc:  # noqa: BLE001 - surface failures as 500s
        raise HTTPException(status_code=500, detail=f"LLM extraction failed: {exc}") from exc


@app.post("/api/summarize", response_model=SummarizeResponse)
def summarize_document(req: SummarizeRequest) -> SummarizeResponse:
    """Generate a non-diagnostic plain-English summary of intake + labs."""
    try:
        summary = generate_patient_summary(req.intake, req.labs)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {exc}") from exc
    return SummarizeResponse(summary=summary)