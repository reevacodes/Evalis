from fastapi import APIRouter,HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

from app.models.submission_model import save_submission
from app.services.submission_service import run_single, evaluate_code
from app.database import question_collection, submission_history_collection
from app.utils.auth_dependency import require_role

router = APIRouter()


# =========================
# 🧪 REQUEST MODELS
# =========================

class RunRequest(BaseModel):
    code: str
    input: str = ""
    language: str = "python"


class SubmitRequest(BaseModel):
    code: str
    question_id: str
    language: str = "python"


# =========================
# 🧪 RUN CODE
# =========================

@router.post("/run")
def run_user_code(
    req: RunRequest,
     _: dict = Depends(require_role("student"))
):
    return run_single(req.code, req.input, req.language)


# =========================
# ✅ SUBMIT CODE
# =========================

@router.post("/submit")
def submit_code(
    req: SubmitRequest,
    user=Depends(require_role("student"))
):
    user_id = user["sub"]  # 🔐 FIX

    try:
        question = question_collection.find_one({
            "_id": ObjectId(req.question_id)
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid question id")

    if not question:
       raise HTTPException(status_code=404, detail="Question not found")

    if question.get("question_type") != "coding":
        raise HTTPException(status_code=400, detail="Not coding")

    test_cases = question.get("test_cases", [])

    if len(test_cases) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 test cases")

    sample_cases = test_cases[:1]
    hidden_cases = test_cases[1:]

    sample_result = evaluate_code(req.code, sample_cases, req.language)
    hidden_result = evaluate_code(req.code, hidden_cases, req.language)

    if not hidden_result:
        raise HTTPException(status_code=500, detail="Evaluation failed")

    final_status = hidden_result.get("status", "RE")

    response = {
        "question_id": req.question_id,
        "question": question.get("question_text"),
        "language": req.language,
        "sample_results": sample_result.get("details", []) if sample_result else [],
        "hidden_results": hidden_result.get("details", []),
        "status": final_status,
        "score": hidden_result.get("score", 0),
        "passed": hidden_result.get("passed", 0),
        "total": hidden_result.get("total", 0),
        "failed_case": hidden_result.get("failed_case"),
        "error": hidden_result.get("error")
}

    try:
        save_submission(
            user_id=user_id,
            question_id=req.question_id,
            data={
                "code": req.code,
                "language": req.language,
                "output": hidden_result,
                "status": final_status,
                "score": hidden_result.get("score", 0),
                "passed": hidden_result.get("passed", 0),
                "total": hidden_result.get("total", 0),
                "submitted_at": datetime.utcnow()
            }
        )
    except Exception as e:
        print("⚠️ Save failed:", e)

    return response


# =========================
# 📊 HISTORY
# =========================

@router.get("/history")
def get_user_history(user=Depends(require_role("student"))):
    user_id = user["sub"]

    history = list(
        submission_history_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("submitted_at", -1)
    )

    return {
        "user_id": user_id,
        "total_submissions": len(history),
        "history": history
    }