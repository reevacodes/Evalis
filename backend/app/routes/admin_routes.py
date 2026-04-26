from fastapi import APIRouter, Depends
from app.utils.auth_dependency import require_role
from app.database import activity_log_collection, user_collection, exam_collection
from bson import ObjectId

router = APIRouter()

@router.get("/activity-logs")
def get_activity_logs(user=Depends(require_role("admin")), limit: int = 50):
    logs = list(activity_log_collection.find().sort("timestamp", -1).limit(limit))
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs

@router.get("/live-sessions")
def get_live_sessions(user=Depends(require_role("admin"))):
    # This will find any student who has an active session in exam_submissions
    # For now, let's just return active exams and how many people took them
    from app.database import exam_submission_collection
    
    # Students who have start_time but not has_submitted
    active_sessions = list(exam_submission_collection.find({"has_submitted": False}))
    
    result = []
    for session in active_sessions:
        student = user_collection.find_one({"_id": ObjectId(session["student_id"])})
        exam = exam_collection.find_one({"_id": ObjectId(session["exam_id"])})
        
        if student and exam:
            result.append({
                "session_id": str(session["_id"]),
                "student_name": student.get("name", "Unknown"),
                "student_email": student.get("email", ""),
                "exam_name": exam.get("exam_name", "Unknown"),
                "start_time": session.get("start_time"),
                "warnings": session.get("warnings", 0)
            })
            
    return result
