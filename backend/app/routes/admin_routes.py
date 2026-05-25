from fastapi import APIRouter, Depends, HTTPException
from app.utils.auth_dependency import require_role
from app.database import activity_log_collection, user_collection, exam_collection
from bson import ObjectId
from pydantic import BaseModel
import secrets
import urllib.request
import json
from datetime import datetime, timedelta
from app.config import RESEND_API_KEY, FRONTEND_URL

router = APIRouter()

class CreateTeacherRequest(BaseModel):
    name: str
    email: str

@router.post("/create-teacher")
def create_teacher(payload: CreateTeacherRequest, user=Depends(require_role("admin"))):
    from app.database import invite_token_collection, user_collection
    
    # Check if user already exists
    existing_user = user_collection.find_one({"email": payload.email})
    is_new_user = True
    if existing_user:
        if existing_user.get("is_active"):
            raise HTTPException(400, "User with this email already exists")
        is_new_user = False
    
    # Generate token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)
    
    # Save user if new
    if is_new_user:
        new_user = {
            "email": payload.email,
            "name": payload.name,
            "role": "teacher",
            "is_active": False,
            "password": None
        }
        user_collection.insert_one(new_user)
    
    # Save token
    invite_token_collection.insert_one({
        "email": payload.email,
        "token": token,
        "expires_at": expires_at,
        "used": False
    })
    
    invite_link = f"{FRONTEND_URL}/set-password?token={token}"
    
    # Send email via centralized SMTP service
    from app.services.email_service import send_teacher_invite_email
    send_teacher_invite_email(payload.email, payload.name, invite_link)
            
    return {"message": "Teacher invited successfully"}



@router.get("/activity-logs")
def get_activity_logs(user=Depends(require_role("admin")), limit: int = 50):
    logs = list(activity_log_collection.find().sort("timestamp", -1).limit(limit))
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs

@router.get("/live-sessions")
def get_live_sessions(user=Depends(require_role("admin"))):
    # This will find any student who has an active session in exam_submissions
    from app.database import exam_submission_collection
    
    # Students who have start_time but not has_submitted
    active_sessions = list(exam_submission_collection.find({"has_submitted": False}))
    
    result = []
    for session in active_sessions:
        # Fallbacks: try finding student in DB
        student = None
        student_id_str = session.get("student_id")
        if student_id_str:
            student = user_collection.find_one({"email": student_id_str})
            if not student:
                try:
                    student = user_collection.find_one({"_id": ObjectId(student_id_str)})
                except Exception:
                    pass
        
        # Try finding exam in DB
        exam = None
        exam_id_str = session.get("exam_id")
        if exam_id_str:
            try:
                exam = exam_collection.find_one({"_id": ObjectId(exam_id_str)})
            except Exception:
                pass
                
        # Resolve fields with database lookup as primary, session document as fallback
        s_name = (student.get("name") if student else None) or session.get("student_name", "Unknown")
        s_email = (student.get("email") if student else None) or session.get("student_email", "")
        e_name = (exam.get("exam_name") if exam else None) or session.get("exam_name", "Unknown")
        
        result.append({
            "session_id": str(session["_id"]),
            "student_name": s_name,
            "student_email": s_email,
            "exam_name": e_name,
            "start_time": session.get("start_time"),
            "warnings": session.get("warnings", 0)
        })
            
    return result

@router.get("/users")
def get_all_users(user=Depends(require_role("admin"))):
    users = list(user_collection.find({}, {"password": 0}).sort("created_at", -1))
    for u in users:
        u["_id"] = str(u["_id"])
    return users

@router.delete("/users/{user_id}")
def delete_user(user_id: str, admin_user=Depends(require_role("admin"))):
    if admin_user.get("sub") == user_id:
        raise HTTPException(400, "Cannot delete yourself")
        
    try:
        obj_id = ObjectId(user_id)
    except:
        raise HTTPException(400, "Invalid user ID")
        
    user_to_delete = user_collection.find_one({"_id": obj_id})
    if not user_to_delete:
        raise HTTPException(404, "User not found")
        
    if user_to_delete.get("role") == "admin":
        raise HTTPException(403, "Cannot delete an admin user")
        
    user_collection.delete_one({"_id": obj_id})
    
    # Optionally delete associated invite tokens
    from app.database import invite_token_collection
    invite_token_collection.delete_many({"email": user_to_delete.get("email")})
    
    return {"message": "User deleted successfully"}
