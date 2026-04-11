from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

class RescheduleRequest(BaseModel):
    reason: str
    preferred_time: datetime

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
    teacher_name: str
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
    coding_answers: Dict[str, str] = {}