from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

class RescheduleRequest(BaseModel):
    category: str
    reason: str
    preferred_time: datetime
    proof_link: Optional[str] = None

class GraceMarkRequest(BaseModel):
    marks: float
    notes: Optional[str] = None

class RequestSchedulePayload(BaseModel):
    requested_start_time: datetime
    requested_duration_minutes: int

class ExamGenerateRequest(BaseModel):
    # REQUIRED FOR UPDATE FLOW
    exam_id: str

    # CORE FILTERING
    subject_code: str
    semester: int
    units: List[str]

    # SECTION CONFIG (from frontend UI)
    sections: List[Dict[str, Any]]

    # OPTIONAL CONFIG
    pattern: Optional[Literal["mcq", "coding", "mixed"]] = None
    exam_type: Optional[Literal["mst", "final"]] = None



class ExamCreateRequest(BaseModel):
    exam_name: str
    subject_code: str
    instructor_email: str
    semester: int

    exam_type: Literal["mst", "final"]
    pattern: Literal["mcq", "coding", "mixed"]

    units: List[str]

    duration_minutes: int

class AddQuestionsRequest(BaseModel):
    section_index: int
    question_ids: List[str]

class DeleteQuestionRequest(BaseModel):
    section_index: int
    question_index: int

class SubmissionRequest(BaseModel):
    mcq_answers: Dict[str, str] = {}
    coding_answers: Dict[str, dict] = {}
    tab_switches: int = 0
    cv_violations: int = 0