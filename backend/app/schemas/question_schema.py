from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Literal, Dict
from datetime import datetime


class Question(BaseModel):

    # -------------------------
    # 📘 Curriculum Mapping
    # -------------------------
    semester: int
    subject_code: str
    subject_name: str
    unit: int
    topic: str

    # -------------------------
    # 🧠 Core Question
    # -------------------------
    question_text: str
    question_type: Literal["mcq", "coding"]
    marks: int

    # -------------------------
    # 📊 Difficulty + Tags
    # -------------------------
    difficulty: Literal["easy", "medium", "hard"]
    tags: List[str] = Field(default_factory=list)

    # -------------------------
    # 🎯 MCQ SECTION
    # -------------------------
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None

    # -------------------------
    # 💻 CODING SECTION (UPDATED 🚀)
    # -------------------------
    language: Optional[Literal["c", "cpp", "python"]] = None

    starter_code: Optional[Dict[str, str]] = None  

    # ✅ NEW (VISIBLE TESTS)
    sample_test_cases: Optional[List[Dict[str, str]]] = None  

    # ✅ NEW (HIDDEN TESTS)
    hidden_test_cases: Optional[List[Dict[str, str]]] = None  

    # ⚠️ BACKWARD COMPATIBILITY
    test_cases: Optional[List[Dict[str, str]]] = None  

    input_format: Optional[str] = None
    output_format: Optional[str] = None
    constraints: Optional[str] = None

    time_limit: float = 2.0
    memory_limit: int = 256

    # -------------------------
    # 📈 INTELLIGENCE LAYER
    # -------------------------
    quality_score: float = 0.5
    times_used: int = 0
    times_correct: int = 0

    # -------------------------
    # 🧾 METADATA
    # -------------------------
    source: str = "teacher"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # -------------------------
    # ✅ VALIDATION LOGIC
    # -------------------------
    @model_validator(mode="after")
    def validate_question(self):

        # =========================
        # ✅ MCQ VALIDATION
        # =========================
        if self.question_type == "mcq":
            if not self.options or len(self.options) < 2:
                raise ValueError("MCQ must have at least 2 options")

            if not self.correct_answer:
                raise ValueError("MCQ must have a correct answer")

            if self.correct_answer not in self.options:
                raise ValueError("Correct answer must be one of the options")

        # =========================
        # 🚀 CODING VALIDATION
        # =========================
        if self.question_type == "coding":

            if not self.language:
                raise ValueError("Coding question must specify language")

            # 🔥 BACKWARD COMPATIBILITY LOGIC
            if not self.sample_test_cases and not self.hidden_test_cases:
                if self.test_cases:
                    # Auto split old test_cases
                    self.sample_test_cases = self.test_cases[:1]  # first visible
                    self.hidden_test_cases = self.test_cases[1:]  # rest hidden
                else:
                    raise ValueError("Coding question must have test cases")

            # ✅ Validate all test cases
            all_cases = (self.sample_test_cases or []) + (self.hidden_test_cases or [])

            if len(all_cases) == 0:
                raise ValueError("At least one test case required")

            for test in all_cases:
                if "input" not in test or "expected_output" not in test:
                    raise ValueError("Each test case must have input and expected_output")

        return self