"""MedLens shared data models and clinical enums."""

import uuid
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RangeStatus(str, Enum):
    """Classification of a lab value relative to its reference range."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    UNKNOWN = "unknown"


class ProvenanceType(str, Enum):
    """Where a piece of clinical data came from."""

    USER_ENTERED = "user_entered"
    AI_EXTRACTED = "ai_extracted"
    USER_EDITED = "user_edited"


class LabResult(BaseModel):
    """A single laboratory result extracted from a clinical document."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_name: str
    value: float
    unit: str
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None
    status: RangeStatus = RangeStatus.UNKNOWN
    source_snippet: str
    provenance: ProvenanceType = ProvenanceType.AI_EXTRACTED
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)


class PatientIntake(BaseModel):
    """Demographic and clinical context submitted for a report."""

    age: int
    sex: str
    symptoms: List[str]
    existing_conditions: List[str]
    allergies: List[str]
    current_medications: List[str]


class ClinicalReportResponse(BaseModel):
    """Full analysis response returned to the user."""

    patient: Optional[PatientIntake] = None
    lab_results: List[LabResult]
    summary: str
    disclaimer: str