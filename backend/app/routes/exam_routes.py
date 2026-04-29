from fastapi import APIRouter, HTTPException, Query, File, UploadFile, Form
import shutil
import uuid
import os
from bson import ObjectId
from datetime import datetime, timedelta,timezone
import re
from pydantic import BaseModel
from app.services.exam_service import MIET_RULES

from app.schemas.exam_schema import ExamGenerateRequest, ExamCreateRequest, RescheduleRequest, AddQuestionsRequest, DeleteQuestionRequest, SubmissionRequest, GraceMarkRequest, RequestSchedulePayload
from app.services.exam_service import generate_exam
from app.database import (
    exam_collection,
    question_collection,
    mock_question_collection,
    past_papers_collection,
    user_collection,
    reschedule_collection,
    exam_submission_collection,
    notification_collection
)
from app.models.question_model import question_helper
from app.services.exam_service import generate_exam
from app.services.evaluation_service import async_evaluate_submission
from fastapi import Depends, BackgroundTasks
from app.utils.auth_dependency import get_current_user, require_role
from app.routes.notification_routes import send_expo_push
from app.services.email_service import send_exam_publish_email, send_reschedule_status_email, send_results_published_email, send_mock_scheduled_email, send_exam_timing_updated_email
from app.services.activity_service import log_activity

router = APIRouter()

# ==========================
# 🔥 NEW: CREATE EXAM (FIX 405)
# ==========================
@router.post("/create")
def create_exam_api(
    data: ExamCreateRequest,
    user=Depends(require_role("teacher"))
):
    try:
        # ==========================
        # 🔥 SAFE INPUT HANDLING
        # ==========================
        exam_type = data.exam_type.lower()
        pattern = data.pattern.lower()

        if exam_type not in MIET_RULES:
            raise HTTPException(status_code=400, detail="Invalid exam type")

        if pattern not in MIET_RULES[exam_type]:
            raise HTTPException(status_code=400, detail="Invalid pattern")

        rules = MIET_RULES[exam_type][pattern]

        # ==========================
        # 🔥 CREATE SECTIONS
        # ==========================
        sections = []

        if "mcq_count" in rules:
            sections.append({
                "type": "mcq",
                "count": rules["mcq_count"]
            })

        if "coding_distribution" in rules:
            total = sum(rules["coding_distribution"].values())
            sections.append({
                "type": "coding",
                "count": total
            })

        elif "coding_total" in rules:
            sections.append({
                "type": "coding",
                "count": rules["coding_total"]
            })

        # ==========================
        # 🔐 CREATE EXAM (SECURE)
        # ==========================
        exam = {
            "exam_name": data.exam_name,
            "subject_code": data.subject_code,
            "instructor_email": data.instructor_email,
            "teacher_name": user["sub"],
            "semester": int(data.semester),
            "exam_type": exam_type,
            "pattern": pattern,
            "units": data.units,
            "duration_minutes": int(data.duration_minutes),
            "total_marks": MIET_RULES[exam_type].get("total_marks", 100),

            "sections": sections,

            "status": "draft",
            "created_at": datetime.now(timezone.utc),
            "created_by": user["sub"]  # 🔥 audit log
        }

        result = exam_collection.insert_one(exam)

        return {
            "message": "Exam created successfully",
            "exam_id": str(result.inserted_id)
        }

    except Exception as e:
        print("🔥 CREATE EXAM ERROR:", str(e))
        raise HTTPException(status_code=400, detail=str(e))

# ==========================
# 🔥 UPDATE EXAM (FOR EDIT MODE)
# ==========================
@router.put("/{exam_id}")
def update_exam_api(
    exam_id: str,
    data: ExamCreateRequest,
    user=Depends(require_role("teacher"))
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        # 🔐 Ownership check
        if exam.get("teacher_name") != user["sub"]:
            raise HTTPException(
                status_code=403,
                detail="Not authorized for this exam"
            )

        # ❌ Prevent update after finalize
        if exam.get("status") == "finalized":
            raise HTTPException(
                status_code=400,
                detail="Cannot update a finalized exam"
            )
        if exam.get("status") == "published":
            raise HTTPException(400, "Cannot modify published exam")

        # 🔥 SAFE INPUT HANDLING
        exam_type = data.exam_type.lower()
        pattern = data.pattern.lower()

        if exam_type not in MIET_RULES:
            raise HTTPException(status_code=400, detail="Invalid exam type")

        if pattern not in MIET_RULES[exam_type]:
            raise HTTPException(status_code=400, detail="Invalid pattern")

        rules = MIET_RULES[exam_type][pattern]

        # ==========================
        # 🔥 CREATE SECTIONS
        # ==========================
        sections = []

        if "mcq_count" in rules:
            sections.append({
                "type": "mcq",
                "count": rules["mcq_count"],
                "questions": []
            })

        if "coding_distribution" in rules:
            total = sum(rules["coding_distribution"].values())
            sections.append({
                "type": "coding",
                "count": total,
                "questions": []
            })

        elif "coding_total" in rules:
            sections.append({
                "type": "coding",
                "count": rules["coding_total"],
                "questions": []
            })

        # 🔥 Secure update (no frontend trust)
        updated_data = {
            "exam_name": data.exam_name,
            "subject_code": data.subject_code,
            "teacher_name": user["sub"],  # 🔐 FIXED
            "semester": int(data.semester) if data.semester else None,
            "exam_type": exam_type,
            "pattern": pattern,
            "units": data.units,
            "duration_minutes": int(data.duration_minutes) if data.duration_minutes else 30,
            "total_marks": MIET_RULES[exam_type].get("total_marks", 100),
            "sections": sections,
            "updated_at": datetime.utcnow(),
            "updated_by": user["sub"]  # 🔥 audit log
        }

        exam_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {"$set": updated_data}
        )

        return {
            "message": "Exam updated successfully",
            "exam_id": exam_id
        }

    except Exception as e:
        print("🔥 UPDATE EXAM ERROR:", str(e))
        raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/generate")
def generate_questions_api(
    data: ExamGenerateRequest,
    user=Depends(require_role("teacher"))
):
    try:
        # ==========================
        # 🔍 FETCH EXAM
        # ==========================
        exam = exam_collection.find_one({"_id": ObjectId(data.exam_id)})

        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        # 🔐 Ownership check
        if exam.get("teacher_name") != user["sub"]:
            raise HTTPException(
                status_code=403,
                detail="Not authorized for this exam"
            )

        # ❌ Prevent regeneration after finalize
        if exam.get("status") == "finalized":
            raise HTTPException(
                status_code=400,
                detail="Cannot generate questions after finalization"
            )
        if exam.get("status") == "published":
            raise HTTPException(400, "Cannot modify published exam")

        # ==========================
        # 🔥 PREPARE GENERATION DATA
        # ==========================
        data.exam_type = exam.get("exam_type")
        data.pattern = exam.get("pattern")

        # ==========================
        # 🔥 GENERATE QUESTIONS
        # ==========================
        # Hybrid Injection Engine: use existing sections as the seed pool
        seed_pool = exam.get("sections", [])
        if data.sections:
            seed_pool = data.sections
            
        generated = generate_exam(data, seed_sections=seed_pool)

        # ==========================
        # 🔥 SAVE INTO DB
        # ==========================
        exam_collection.update_one(
            {"_id": ObjectId(data.exam_id)},
            {
                "$set": {
                    "sets": generated["exam"]["sets"],
                    "sections": generated["exam"]["sets"].get("A", []), # default fallback UI
                    "status": "draft",
                    "generated_by": user["sub"],  # 🔥 audit
                    "generated_at": datetime.utcnow()
                }
            }
        )

        return {
            "message": "Questions generated successfully",
            "total_questions": generated["question_count"]
        }

    except Exception as e:
        print("🔥 GENERATE ERROR:", str(e))
        raise HTTPException(status_code=400, detail=str(e))

# ==========================
# 🔥 FINALIZE EXAM
# ==========================
@router.put("/{exam_id}/finalize")
def finalize_exam_api(
    exam_id: str,
    user=Depends(require_role("teacher"))
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        # 🔐 Ownership check
        if exam.get("teacher_name") != user["sub"]:
            raise HTTPException(status_code=403, detail="Not authorized for this exam")

        # ❌ Prevent re-finalizing
        if exam.get("status") == "finalized":
            raise HTTPException(
                status_code=400,
                detail="Exam already finalized"
            )

        # ✅ Check if questions exist
        sections = exam.get("sections", [])

        if not sections or not all(
            sec.get("questions") and len(sec.get("questions")) == sec.get("count")
            for sec in sections
        ):
            raise HTTPException(
                status_code=400,
                detail="All sections must have complete questions before finalizing"
            )

        # ✅ Update status
        exam_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {
                "$set": {
                    "status": "finalized",
                    "finalized_at": datetime.utcnow(),
                    "finalized_by": user["sub"]  # 🔥 audit log
                }
            }
        )

        return {
            "message": "Exam finalized successfully"
        }

    except Exception as e:
        print("🔥 FINALIZE ERROR:", str(e))
        raise HTTPException(status_code=400, detail=str(e))

# ==========================
# 🔥 DELETE EXAM
# ==========================

@router.delete("/{exam_id}")
def delete_exam_api(
    exam_id: str,
    user=Depends(get_current_user)   # ✅ BOTH ROLES ALLOWED
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        role = user.get("role")

        # ==========================
        # 👨‍🏫 TEACHER RULE
        # ==========================
        if role == "teacher":
            if exam.get("teacher_name") != user["sub"]:
                raise HTTPException(403, "Not authorized for this exam")

            if exam.get("status") not in ["draft", "finalized"]:
                raise HTTPException(
                    status_code=400,
                    detail="Teachers can only delete draft or finalized exams before scheduling"
                )

        # ==========================
        # 👨‍💼 ADMIN RULE
        # ==========================
        elif role == "admin":
            current_state = calculate_exam_state(exam)
            if current_state == "active":
                raise HTTPException(status_code=400, detail="Cannot remove an exam while it is currently live.")

        else:
            raise HTTPException(403, "Not authorized")

        # ==========================
        # 🔥 SOFT DELETE
        # ==========================
        exam_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {"$set": {"is_deleted": True, "deleted_by": user["sub"], "deleted_at": datetime.utcnow()}}
        )

        return {
            "message": "Exam deleted successfully",
            "deleted_by": user["sub"],
            "role": role
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
# ==========================
# 🔥 REQUEST APPROVAL (SEND TO ADMIN)
# ==========================
@router.put("/{exam_id}/request")
def request_exam_api(
    exam_id: str,
    user=Depends(require_role("teacher"))
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        if exam.get("teacher_name") != user["sub"]:
            raise HTTPException(403, "Not authorized for this exam")

        if exam.get("status") != "finalized":
            raise HTTPException(
                status_code=400,
                detail="Only finalized exams can be sent for approval"
            )

        exam_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {
                "$set": {
                    "status": "requested",
                    "requested_at": datetime.utcnow()
                }
            }
        )

        return {"message": "Exam sent to admin for approval"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================
# 🔥 TIME STATUS & VALIDATION HELPERS
# ==========================
def validate_college_hours(dt: datetime):
    # Convert to IST for evaluation
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
        
    dt_ist = dt.astimezone(timezone(timedelta(hours=5, minutes=30)))
    
    # 0 = Monday, 4 = Friday, 5 = Saturday, 6 = Sunday
    if dt_ist.weekday() > 4:
        raise HTTPException(status_code=400, detail="Date error: Please select a date between Monday and Friday.")
        
    # Check if time is between 09:30 and 13:00 (1 PM)
    # time_minutes = dt_ist.hour * 60 + dt_ist.minute
    
    # if time_minutes < (9 * 60 + 30) or time_minutes > (13 * 60):
    #     raise HTTPException(status_code=400, detail="Exams must be scheduled during college hours (09:30 AM to 01:00 PM IST).")


def calculate_exam_state(exam, student_id=None):
    if not exam.get("start_time"):
        return "unscheduled"

    now = datetime.utcnow()

    start = exam["start_time"]
    
    # Strip timezone info if present to safely compare with utcnow()
    if start.tzinfo is not None:
        start = start.replace(tzinfo=None)

    end = start + timedelta(minutes=exam.get("duration_minutes", 30))

    if now < start:
        return "scheduled"
    elif start <= now < end:
        return "active"
    else:
        return "expired"


# ==========================
# 🔥 GET ALL EXAMS (FIXED 🔥)
# ==========================
@router.get("/")
def get_all_exams_api(user=Depends(get_current_user)):
    try:
        role = user.get("role")

        if role == "admin":
            exams = list(exam_collection.find({"is_deleted": {"$ne": True}, "exam_type": {"$ne": "Practice"}}).sort("created_at", -1))

        elif role == "teacher":
            exams = list(
                exam_collection.find({"teacher_name": user["sub"], "is_deleted": {"$ne": True}, "exam_type": {"$ne": "Practice"}})
                .sort("created_at", -1)
            )

        elif role == "student":   # ✅ ADD THIS BLOCK
            db_user = user_collection.find_one({"email": user["sub"]})
            student_semester = db_user.get("semester") if db_user else None

            query = {"status": "published", "is_deleted": {"$ne": True}, "exam_type": {"$ne": "Practice"}}
            if student_semester is not None:
                query["semester"] = student_semester

            exams = list(
                exam_collection.find(query)
                .sort("created_at", -1)
            )
            
            my_subs = list(exam_submission_collection.find({"student_id": user.get("sub")}))
            my_sub_exam_ids = [str(s.get("exam_id")) for s in my_subs]

            my_reschedules = list(reschedule_collection.find({"student_id": user.get("sub")}))
            my_reschedules_map = {str(r.get("exam_id")): r.get("status") for r in my_reschedules}

        else:
            raise HTTPException(403, "Not authorized")

        for exam in exams:
            exam["_id"] = str(exam["_id"])
            
            # Apply student-specific overrides (Reschedules)
            if role == "student":
                exam["has_submitted"] = exam["_id"] in my_sub_exam_ids
                exam["reschedule_status"] = my_reschedules_map.get(exam["_id"], None)
                
                overrides = exam.get("overrides", [])
                for ov in overrides:
                    if ov.get("student_id") == user.get("sub"):
                        if "new_start_time" in ov:
                            exam["start_time"] = ov["new_start_time"]
                            exam["is_rescheduled"] = True
                        break
            
            exam["time_status"] = calculate_exam_state(exam)
            exam.pop("sections", None)
            exam.pop("sets", None)       # 🔥 Enforce Zero-Trust globally across dashboard
            exam.pop("overrides", None)  # Hide other students' overrides

            # 🔥 FIX TIMEZONE SERIALIZATION BUG (so 10:30 AM IST doesn't become 5:00 AM IST)
            if "start_time" in exam and isinstance(exam["start_time"], datetime):
                exam["start_time"] = exam["start_time"].replace(tzinfo=timezone.utc)
            if "requested_start_time" in exam and isinstance(exam["requested_start_time"], datetime):
                exam["requested_start_time"] = exam["requested_start_time"].replace(tzinfo=timezone.utc)

        return {
            "count": len(exams),
            "exams": exams
        }

    except Exception as e:
        print("🔥 FETCH ALL ERROR:", str(e))
        raise HTTPException(status_code=400, detail=str(e))


# ==========================
# 🔥 NEW: SCHEDULE EXAM
# ==========================
@router.put("/{exam_id}/schedule")
def schedule_exam(exam_id: str, data: dict, user=Depends(require_role("admin"))):
    exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    is_reschedule = exam.get("status") in ["published", "scheduled"]

    if not is_reschedule:
        if not exam.get("schedule_requested"):
            raise HTTPException(
                status_code=400,
                detail="No schedule request found"
            )
        if exam.get("status") != "finalized":
            raise HTTPException(
                status_code=400,
                detail="Only finalized exams can be scheduled"
            )
        
    current_state = calculate_exam_state(exam)
    if current_state == "active":
        raise HTTPException(status_code=400, detail="Cannot reschedule an active exam.")
    elif current_state == "expired":
        raise HTTPException(status_code=400, detail="Cannot reschedule an expired exam. Please duplicate it.")

    # ✅ GET DATA
    start_time_str = data.get("start_time")
    duration = data.get("duration_minutes")

    if not start_time_str or not duration:
        raise HTTPException(
            status_code=400,
            detail="start_time and duration_minutes required"
        )

    # ✅ PARSE TIME
    start_time = datetime.fromisoformat(start_time_str).replace(tzinfo=None)
    
    # ✅ VALIDATE SCHEDULING TIMEFRAME (Disabled for testing)
    # if start_time < datetime.utcnow() + timedelta(days=1):
    #     raise HTTPException(
    #         status_code=400,
    #         detail="Exams must be scheduled at least 1 day in advance."
    #     )

    # ✅ ZERO-TRUST JUST-IN-TIME SET GENERATION
    # The teacher built the Seed Pool. Now we enforce the Hybrid Engine.
    generated = generate_exam(
        subject_code=exam.get("subject_code"),
        semester=exam.get("semester"),
        exam_type=exam.get("exam_type", "mst"),
        pattern=exam.get("pattern"),
        units=exam.get("units"),
        seed_sections=exam.get("sections", []),
    )

    # ✅ SAVE
    exam_collection.update_one(
        {"_id": ObjectId(exam_id)},
        {
            "$set": {
                "start_time": start_time,
                "duration_minutes": duration,
                "scheduled_at": datetime.now(timezone.utc),
                "schedule_requested": False,   # reset flag
                "scheduled_by": user["sub"],    # 🔥 ADD HERE
                "sets": generated["exam"]["sets"]
            }
        }
    )

    log_activity(
        actor_id=user["sub"],
        actor_name=user.get("name", "Admin"),
        role="admin",
        action="Exam Scheduled",
        details=f"Admin scheduled exam '{exam.get('exam_name')}' for {start_time}."
    )

    # 📡 NOTIFY STUDENTS IF IT WAS ALREADY PUBLISHED
    if is_reschedule:
        try:
            exam_name = exam.get("exam_name", "Exam")
            students = list(user_collection.find({"role": "student"}))
            if students:
                notifications = []
                for student in students:
                    notifications.append({
                        "user_id": student.get("email"),
                        "title": "Exam Timing Updated",
                        "message": f"The timing for '{exam_name}' has been updated by the administration.",
                        "type": "exam",
                        "link": None,
                        "is_read": False,
                        "created_at": datetime.utcnow()
                    })
                notification_collection.insert_many(notifications)
                
                for student in students:
                    email = student.get("email")
                    if email:
                        send_exam_timing_updated_email(email, exam_name, start_time_str)
                        send_expo_push(email, "Exam Timing Updated", f"The timing for '{exam_name}' has been updated.")
        except Exception as e:
            print("Failed to broadcast reschedule notifications:", str(e))

    return {"message": "Exam scheduled successfully"}


# ==========================
# 🔥 GET EXAM
# ==========================
@router.get("/{exam_id}")
def get_exam_api(
    exam_id: str,
    user=Depends(get_current_user)
):
    exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    exam["_id"] = str(exam["_id"])
    role = user.get("role")
    
    # 🔥 Apply Reschedule Overrides Before Time Status Calc
    if role == "student":
        overrides = exam.get("overrides", [])
        for ov in overrides:
            if ov.get("student_id") == user.get("sub"):
                if "new_start_time" in ov:
                    exam["start_time"] = ov["new_start_time"]
                    exam["is_rescheduled"] = True
                break

    exam["time_status"] = calculate_exam_state(exam)

    # ==========================
    # 👨‍🎓 STUDENT RESTRICTIONS + ROUTING
    # ==========================
    if role == "student":
        if exam.get("status") != "published":
            raise HTTPException(403, "Exam not available")
            
        # Mathematical Route Distribution
        sets = exam.get("sets")
        if sets:
            # Regex numerical identifier from email/name
            email = user.get("email") or user.get("sub") or ""
            match = re.search(r'\d+', email)
            if match:
                identifier = int(match.group())
            else:
                identifier = len(email)
            
            # Modulo 4 routing
            set_keys = sorted(list(sets.keys())) # Avoid random dict order issue
            if set_keys:
                idx = identifier % len(set_keys)
                assigned_set = set_keys[idx]
                exam["sections"] = sets[assigned_set]
                print(f"🔥 STUDENT REGEX MATCH: Modulo ({identifier} % {len(set_keys)} = {idx}) -> Assigned Set {assigned_set}")
                
        # Always pop sets for students to prevent massive downloads and cheating
        exam.pop("sets", None)

    # ✅ ALLOW ACCESS IF ACTIVE OR ALREADY STARTED
    if exam["time_status"] == "scheduled":
        raise HTTPException(403, "Exam not started yet")

    if exam["time_status"] == "expired":
        raise HTTPException(403, "Exam expired")
    

    # ==========================
    # ⏱️ TIME LEFT (your logic)
    # ==========================
    exam["time_left"] = None

    if exam["time_status"] == "active":
        now = datetime.utcnow()
        start = exam.get("start_time")

        if start:
            if start.tzinfo is None:
                start = start

            end = start + timedelta(minutes=exam.get("duration_minutes", 30))
            remaining = (end - now).total_seconds()
            exam["time_left"] = max(0, int(remaining))

    # ==========================
    # 👨‍🏫 TEACHER / ADMIN RESTRICTIONS
    # ==========================
    if role in ["admin", "teacher"]:
        # ZERO-TRUST POLICY: 
        # Once finalized, the human interfaces cannot read the questions until unlocked.
        if exam.get("status") in ["finalized", "published", "scheduled"]:
            exam.pop("sections", None)
            exam.pop("sets", None)

    # 🔥 FIX TIMEZONE SERIALIZATION BUG
    if "start_time" in exam and isinstance(exam["start_time"], datetime):
        exam["start_time"] = exam["start_time"].replace(tzinfo=timezone.utc)
    if "requested_start_time" in exam and isinstance(exam["requested_start_time"], datetime):
        exam["requested_start_time"] = exam["requested_start_time"].replace(tzinfo=timezone.utc)

    return exam


# ==========================
# 🔥 SUBMIT EXAM
# ==========================
@router.post("/{exam_id}/submit")
def submit_exam_api(
    exam_id: str,
    payload: SubmissionRequest,
    background_tasks: BackgroundTasks,
    user=Depends(require_role("student"))
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            raise HTTPException(404, "Exam not found")

        sets = exam.get("sets")
        if not sets:
            raise HTTPException(400, "Exam sets unavailable")

        # Reconstruct Mathematical Route Distribution to find Set
        email = user.get("email") or user.get("sub") or ""
        match = re.search(r'\d+', email)
        if match:
            identifier = int(match.group())
        else:
            identifier = len(email)
        
        set_keys = sorted(list(sets.keys()))
        idx = identifier % len(set_keys)
        assigned_set = set_keys[idx]
        assigned_sections = sets[assigned_set]

        # Check if already submitted (Allow Overwrite for Testing)
        existing = exam_submission_collection.find_one({
            "exam_id": exam_id,
            "student_id": user.get("sub")
        })
        # We will use upsert instead of rejecting

        # Auto grade MCQs & Analytics Aggregation
        mcq_section = next((s for s in assigned_sections if s["type"] == "mcq"), None)
        mcq_score = 0
        correct_count = 0
        topic_stats = {}
        total_mcqs = 0
        attempted_mcqs = 0

        if mcq_section:
            for q in mcq_section.get("questions", []):
                total_mcqs += 1
                q_id = str(q.get("id") or q.get("_id"))
                correct = q.get("correct_answer")
                topic = q.get("topic", "General")
                
                if topic not in topic_stats:
                    topic_stats[topic] = {"total": 0, "correct": 0}
                
                topic_stats[topic]["total"] += 1
                
                student_answer = payload.mcq_answers.get(q_id)
                if student_answer:
                    attempted_mcqs += 1
                    
                if student_answer and correct and student_answer.strip().lower() == correct.strip().lower():
                    mcq_score += mcq_section.get("marks_per_question", 1)
                    correct_count += 1
                    topic_stats[topic]["correct"] += 1
                    
        accuracy = (correct_count / total_mcqs * 100) if total_mcqs > 0 else 0
        
        strong_topics = []
        weak_topics = []
        for topic, stat in topic_stats.items():
            hit_rate = stat["correct"] / stat["total"] if stat["total"] > 0 else 0
            if hit_rate >= 0.7:
                strong_topics.append(topic)
            elif hit_rate <= 0.4:  
                weak_topics.append(topic)
                
        analytics = {
            "accuracy": round(accuracy, 2),
            "total_mcqs": total_mcqs,
            "attempted_mcqs": attempted_mcqs,
            "correct_mcqs": correct_count,
            "strong_topics": strong_topics,
            "weak_topics": weak_topics,
            "topic_breakdown": topic_stats
        }

        doc = {
            "student_id": user.get("sub"),
            "student_email": user.get("email"),
            "exam_id": exam_id,
            "assigned_set": assigned_set,
            "mcq_answers": payload.mcq_answers,
            "coding_answers": payload.coding_answers,
            "mcq_score": mcq_score,
            "total_score": mcq_score, 
            "analytics": analytics,
            "tab_switches": payload.tab_switches,
            "cv_violations": payload.cv_violations,
            "pending_manual_review": len(payload.coding_answers) > 0,
            "submitted_at": datetime.now(timezone.utc)
        }
        doc_info = exam_submission_collection.update_one(
            {"exam_id": exam_id, "student_id": user.get("sub")},
            {"$set": doc},
            upsert=True
        )
        
        submission_id = doc_info.upserted_id or (existing.get("_id") if existing else None)
        
        # If there's an insert instead of upsert fallback:
        if not submission_id:
             new_doc = exam_submission_collection.find_one({"exam_id": exam_id, "student_id": user.get("sub")})
             submission_id = new_doc["_id"]

        # FIRE BACKGROUND WORKER 
        if submission_id:
            background_tasks.add_task(async_evaluate_submission, str(submission_id))

        return {"message": "Exam submitted successfully", "mcq_score": mcq_score}

    except HTTPException:
        raise
    except Exception as e:
        print("🔥 SUBMIT EXAM ERROR:", str(e))
        raise HTTPException(status_code=400, detail="Failed to submit exam")

# ==========================
# 📊 GET SUBMISSION RESULTS (STUDENT)
# ==========================
@router.get("/submissions/{exam_id}/me")
def get_my_submission_results(
    exam_id: str,
    user=Depends(require_role("student"))
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            raise HTTPException(404, "Exam not found")

        is_published = exam.get("is_results_published", False)

        submission = exam_submission_collection.find_one({
            "exam_id": exam_id,
            "student_id": user.get("sub")
        })

        if not submission:
            raise HTTPException(404, "Submission not found")

        # Clean ObjectIds
        submission["_id"] = str(submission["_id"])

        if not is_published:
            return {
                "status": "submitted",
                "is_published": False,
                "message": "Results are currently being evaluated and will be published by the Instructor shortly."
            }

        return {
            "status": "submitted",
            "is_published": True,
            "submission": submission,
            "exam_title": exam.get("exam_name"),
            "exam_sections": exam.get("sections", []),
            "total_marks": exam.get("total_marks", 0)
        }

    except HTTPException:
        raise
    except Exception as e:
        print("🔥 GET RESULTS ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Internal error retrieving results")

# ==========================
# 📊 GET SUBMISSION RESULTS BY ID (ADMIN/TEACHER)
# ==========================
@router.get("/submissions/detail/{submission_id}")
def get_submission_results_by_id(
    submission_id: str,
    user=Depends(get_current_user)
):
    try:
        role = user.get("role")
        if role not in ["admin", "teacher"]:
            raise HTTPException(403, "Not authorized to view student results")

        submission = exam_submission_collection.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            raise HTTPException(404, "Submission not found")

        exam_id = submission.get("exam_id")
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        
        # Clean ObjectIds
        submission["_id"] = str(submission["_id"])

        return {
            "status": "submitted",
            "is_published": True, # Always show to admin/teacher
            "submission": submission,
            "exam_title": exam.get("exam_name") if exam else "Unknown Exam",
            "exam_sections": exam.get("sections", []) if exam else [],
            "total_marks": exam.get("total_marks", 0) if exam else 100
        }

    except Exception as e:
        print("🔥 GET SUBMISSION DETAIL ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Internal error retrieving submission details")

# ==========================
# 📊 GET EXAM SUBMISSIONS (INSTRUCTORS)
# ==========================
@router.get("/{exam_id}/submissions")
def get_all_submissions_for_exam(
    exam_id: str,
    user=Depends(require_role(["admin", "teacher"]))
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            raise HTTPException(404, "Exam not found")

        submissions = list(exam_submission_collection.find({"exam_id": exam_id}))
        
        # Grab all student emails to fetch their actual names
        student_emails = list(set(sub.get("student_id") for sub in submissions if sub.get("student_id")))
        users = list(user_collection.find({"email": {"$in": student_emails}}, {"email": 1, "name": 1}))
        user_dict = {u["email"]: u.get("name", "Anonymous") for u in users}
        
        # Strip massive payloads (like coding_answers chunks) and just return the high level metadata
        for sub in submissions:
            sub["_id"] = str(sub["_id"])
            
            email = sub.get("student_id")
            if not sub.get("student_name"):
                sub["student_name"] = user_dict.get(email, "Anonymous")
            sub["student_email"] = email
                
            if "coding_answers" in sub:
                sub["coding_answers_count"] = len(sub["coding_answers"])
                del sub["coding_answers"]
            if "mcq_answers" in sub:
                del sub["mcq_answers"]

        return {
            "exam_title": exam.get("title", exam.get("exam_name", "Exam")),
            "total_marks": exam.get("total_marks", 100),
            "start_time": exam.get("start_time"),
            "duration_minutes": exam.get("duration_minutes"),
            "enrolled_count": len(exam.get("students", [])),
            "submissions": submissions
        }

    except Exception as e:
        print("🔥 GET LEDGER ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Internal error retrieving ledger")

# ==========================
# ==========================
# 🔥 ISSUE GRACE MARKS (TEACHER/ADMIN)
# ==========================
@router.put("/{exam_id}/grace-mark")
def apply_grace_marks_api(
    exam_id: str,
    payload: GraceMarkRequest,
    user=Depends(get_current_user)
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            raise HTTPException(404, "Exam not found")
            
        role = user.get("role")
        if role == "teacher" and exam.get("teacher_name") != user["sub"]:
            raise HTTPException(403, "Not authorized to issue grace marks for this exam")
        elif role not in ["admin", "teacher"]:
            raise HTTPException(403, "Not authorized")
            
        # 1. Update the Exam Configuration globally
        exam_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {"$set": {
                "grace_marks": payload.marks,
                "grace_notes": payload.notes,
                "grace_issued_by": user.get("sub"),
                "grace_issued_at": datetime.utcnow()
            }}
        )
        
        # 2. Aggregation Pipeline to retroactively bulk-update ALL Submissions
        # We add the marks natively via MongoDB vector addition
        result = exam_submission_collection.update_many(
            {"exam_id": exam_id},
            [{"$set": {
                "grace_marks": payload.marks,
                "total_score": {"$add": [{"$ifNull": ["$mcq_score", 0]}, {"$ifNull": ["$coding_score", 0]}, payload.marks]}
            }}]
        )
        
        print(f"🔥 GRACE MARK CASCADED to {result.modified_count} SUBMISSIONS!")
        
        return {
            "message": f"Successfully applied {payload.marks} Grace Marks across the roster.",
            "modified_submissions": result.modified_count
        }
        
    except Exception as e:
        print("🔥 GRACE MARK ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to cascade Grace Marks")

# ==========================
# 🔥 PUBLISH RESULTS (ADMIN)
# ==========================
@router.put("/{exam_id}/publish-results")
def publish_results_api(
    exam_id: str,
    user=Depends(require_role("admin"))
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            raise HTTPException(404, "Exam not found")

        current_val = exam.get("is_results_published", False)
        
        # Prevent publishing if exam is not expired
        if not current_val:
            state = calculate_exam_state(exam)
            if state != "expired":
                raise HTTPException(400, "Cannot publish results before the exam has ended.")
        
        exam_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {"$set": {"is_results_published": not current_val}}
        )
        
        # 📌 NOTIFICATION TRIGGER
        if not current_val: # Only notify if turning ON publishing
            submissions = exam_submission_collection.find({"exam_id": exam_id})
            notifications = []
            for sub in submissions:
                notifications.append({
                    "user_id": sub["student_id"],
                    "title": "Exam Results Published",
                    "message": f"Results for '{exam.get('exam_name', exam.get('title'))}' have been mathematically cleared and published by your instructor.",
                    "type": "exam",
                    "link": f"/exam/submissions/{exam_id}/me",
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc)
                })
            
            if notifications:
                notification_collection.insert_many(notifications)
                for n in notifications:
                    send_expo_push(n["user_id"], n["title"], n["message"], {"link": n["link"]})

                # Fire off Emails
                total = float(exam.get("total_marks", 100))
                for sub in submissions:
                    score = float(sub.get("total_score", 0))
                    send_results_published_email(sub["student_id"], exam.get("exam_name", "Exam"), score, total)
        
        return {"message": "Results visibility toggled", "is_results_published": not current_val}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to publish results")

# ==========================
# 🔥 PUBLISH EXAM TO STUDENTS
# ==========================
@router.put("/{exam_id}/publish")
def publish_exam_api(
    exam_id: str,
    user=Depends(require_role("admin"))
):
    exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if exam.get("status") != "finalized":
        raise HTTPException(
            status_code=400,
            detail="Only finalized exams can be published"
        )

    if not exam.get("start_time"):
        raise HTTPException(
            status_code=400,
            detail="Schedule exam before publishing"
        )
        
    start_time = exam.get("start_time")
    if isinstance(start_time, str):
        try:
            start_time = datetime.fromisoformat(start_time).replace(tzinfo=None)
        except:
            pass
    if isinstance(start_time, datetime):
        pass # Temporarily disabled for testing
        # if start_time < datetime.now() + timedelta(days=10):
        #     raise HTTPException(
        #         status_code=400,
        #         detail="Exams must be published at least 10 days before the scheduled start time."
        #     )

    exam_collection.update_one(
        {"_id": ObjectId(exam_id)},
        {
            "$set": {
                "status": "published",
                "published_at": datetime.now(timezone.utc),
                "published_by": user["sub"]
            }
        }
    )

    log_activity(
        actor_id=user["sub"],
        actor_name=user.get("name", "Admin"),
        role="admin",
        action="Exam Published",
        details=f"Admin published exam '{exam.get('exam_name')}'."
    )

    # 📡 NOTIFICATION BROADCAST TO ALL STUDENTS
    try:
        exam_name = exam.get("exam_name") or exam.get("title", "A new formal exam")
        subject_code = exam.get("subject_code", "N/A")
        
        # Pass ISO format so the email service can correctly convert to IST
        start_t = exam.get("start_time")
        time_str = start_t.isoformat() if isinstance(start_t, datetime) else str(start_t)
        duration = exam.get("duration_minutes", 0)

        students = list(user_collection.find({"role": "student"}))
        
        if students:
            notifications = []
            for student in students:
                notifications.append({
                    "user_id": student.get("email"),
                    "title": "New Examination Available",
                    "message": f"'{exam_name}' has been published and is now live on your dashboard.",
                    "type": "exam",
                    "link": None, # Will just show on dashboard
                    "is_read": False,
                    "created_at": datetime.utcnow()
                })
            
            notification_collection.insert_many(notifications)
            
            for student in students:
                email = student.get("email")
                if email:
                    send_exam_publish_email(email, exam_name, subject_code, time_str, duration)
                    send_expo_push(email, "New Examination Available", f"'{exam_name}' has been published and is now live on your dashboard.")
                    
            print(f"Broadcasted Exam Publish Email and Push to {len(students)} students.")
    except Exception as e:
        print("Failed to broadcast exam publish notifications:", str(e))

    return {"message": "Exam published successfully and students notified"}


# ==========================
# 🔥 START EXAM
# ==========================
@router.post("/{exam_id}/start")
def start_exam(
    exam_id: str,
    user=Depends(require_role("student"))
):
    exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if exam.get("status") != "published":
        raise HTTPException(
            status_code=400,
            detail="Exam not published"
        )

    state = calculate_exam_state(exam)

    if state == "scheduled":
        raise HTTPException(
            status_code=400,
            detail="Exam has not started yet"
        )

    if state == "expired":
        raise HTTPException(

            status_code=400,
            detail="Exam has expired"
        )

    return {
        "message": "Exam started",
        "start_time": exam["start_time"],
        "started_by": user["sub"]
    }

# ==========================
# 🔥 ADD QUESTIONS TO EXAM (BATCH)
# ==========================
@router.post("/{exam_id}/add-questions")
def add_questions_to_exam(
    exam_id: str,
    payload: AddQuestionsRequest,
    user=Depends(require_role("teacher"))
):
    try:
        section_index = payload.section_index
        question_ids = payload.question_ids

        if section_index is None or not question_ids:
            raise HTTPException(status_code=400, detail="Missing required parameters")

        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
            
        if exam.get("teacher_name") != user["sub"]:
            raise HTTPException(status_code=403, detail="Not authorized")
            
        if exam.get("status") != "draft":
            raise HTTPException(status_code=400, detail="Can only add to draft exams")

        sections = exam.get("sections", [])
        if section_index >= len(sections):
            raise HTTPException(status_code=400, detail="Invalid section index")

        target_section = sections[section_index]
        max_count = target_section.get("count", 0)
        current_questions = target_section.get("questions", [])

        if len(current_questions) + len(question_ids) > max_count:
            raise HTTPException(status_code=400, detail="Adding these questions exceeds the section limit")

        # Fetch actual question objects from DB
        questions_to_add = list(question_collection.find({"_id": {"$in": [ObjectId(qid) for qid in question_ids]}}))
        
        # Convert ObjectIds to strings
        for q in questions_to_add:
            q["_id"] = str(q["_id"])
                
        # Push to array safely
        if "questions" not in sections[section_index]:
            sections[section_index]["questions"] = []
            
        sections[section_index]["questions"].extend(questions_to_add)

        exam_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {"$set": {"sections": sections}}
        )

        return {"message": f"Successfully added {len(questions_to_add)} questions."}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================
# 🔥 DELETE QUESTION FROM EXAM (NEW - FIX 404)
# ==========================
@router.delete("/{exam_id}/question")
def delete_exam_question(
    exam_id: str,
    payload: DeleteQuestionRequest,
    user=Depends(require_role("teacher"))
):
    try:
        section_index = payload.section_index
        question_index = payload.question_index

        # 🔍 FETCH EXAM
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        if exam.get("teacher_name") != user["sub"]:
            raise HTTPException(status_code=403, detail="Not authorized for this exam")

        sections = exam.get("sections", [])

        # ❌ VALIDATION
        if section_index is None or question_index is None:
            raise HTTPException(status_code=400, detail="Missing indices")

        if section_index >= len(sections):
            raise HTTPException(status_code=400, detail="Invalid section index")

        section_questions = sections[section_index].get("questions", [])

        if question_index >= len(section_questions):
            raise HTTPException(status_code=400, detail="Invalid question index")

        # 🔥 REMOVE QUESTION
        section_questions.pop(question_index)
        sections[section_index]["questions"] = section_questions

        # 🔥 UPDATE DB
        exam_collection.update_one(
            {"_id": ObjectId(exam_id)},
            {"$set": {"sections": sections}}
        )

        return {
            "message": "Question deleted from exam successfully",
            "section_index": section_index,
            "question_index": question_index
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{exam_id}/request-schedule")
def request_schedule(
    exam_id: str, 
    payload: RequestSchedulePayload,
    user=Depends(require_role("teacher"))
):
    exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.get("teacher_name") != user["sub"]:
        raise HTTPException(403, "Not authorized for this exam")

    if exam.get("status") != "finalized":
        raise HTTPException(
            status_code=400,
            detail="Only finalized exams can request scheduling"
        )
        
    validate_college_hours(payload.requested_start_time)

    exam_collection.update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {
            "schedule_requested": True,
            "requested_start_time": payload.requested_start_time,
            "requested_duration_minutes": payload.requested_duration_minutes
        }}
    )

    from app.routes.notification_routes import notify_admins
    notify_admins(
        title="Schedule Request",
        message=f"Instructor {user.get('name', user['sub'])} requested to schedule exam '{exam.get('exam_name')}'.",
        link="/admin/exams"
    )

    return {"message": "Schedule request sent"}

@router.put("/{exam_id}/request-unlock")
def request_unlock(exam_id: str, user=Depends(require_role("teacher"))):
    exam = exam_collection.find_one({"_id": ObjectId(exam_id)})

    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.get("teacher_name") != user["sub"]:
        raise HTTPException(403, "Not authorized for this exam")

    exam_collection.update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {"unlock_requested": True}}
    )

    from app.routes.notification_routes import notify_admins
    notify_admins(
        title="Unlock Request",
        message=f"Instructor {user.get('name', user['sub'])} requested to unlock exam '{exam.get('exam_name')}'.",
        link="/admin/exams"
    )

    return {"message": "Unlock request sent"}
# ==========================
# 🔥 RESCHEDULE REQUESTS
# ==========================

@router.post("/{exam_id}/reschedule")
def request_reschedule(
    exam_id: str,
    category: str = Form(...),
    reason: str = Form(...),
    preferred_time: str = Form(...),
    proof_file: UploadFile = File(None),
    user=Depends(require_role("student"))
):
    # Verify exam exists
    exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    start_time = exam.get("start_time")
    if start_time:
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        # Ensure start_time is naive for comparison, assuming local time
        if start_time.tzinfo is not None:
             start_time = start_time.replace(tzinfo=None)
        
        if start_time < datetime.now() + timedelta(days=5):
            raise HTTPException(
                status_code=400,
                detail="Reschedule requests must be submitted at least 5 days before the exam's scheduled start time."
            )
        
    # Check if a pending or approved request already exists
    existing_req = reschedule_collection.find_one({
        "student_id": user["sub"],
        "exam_id": exam_id,
        "status": {"$in": ["pending", "approved"]}
    })
    
    if existing_req:
        status_msg = existing_req.get("status")
        if status_msg == "approved":
            raise HTTPException(status_code=400, detail="Your reschedule request for this exam has already been approved.")
        raise HTTPException(status_code=400, detail="You already have a pending reschedule request for this exam.")
        
    # Check total limit (max 2 attempts)
    total_requests = reschedule_collection.count_documents({
        "student_id": user["sub"],
        "exam_id": exam_id
    })
    
    if total_requests >= 2:
        raise HTTPException(
            status_code=400, 
            detail="You have reached the maximum number of reschedule requests (2) for this exam. Please contact the administrator directly."
        )

    # Handle File Upload
    proof_link = None
    if proof_file and proof_file.filename:
        upload_dir = "uploads/reschedule_proofs"
        os.makedirs(upload_dir, exist_ok=True)
        ext = proof_file.filename.split(".")[-1] if "." in proof_file.filename else "bin"
        filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(proof_file.file, buffer)
            
        proof_link = f"http://localhost:8000/static/reschedule_proofs/{filename}"
        
    try:
        preferred_time_dt = datetime.fromisoformat(preferred_time.replace("Z", "+00:00"))
    except:
        preferred_time_dt = datetime.utcnow()
        
    validate_college_hours(preferred_time_dt)
        
    doc = {
        "student_id": user["sub"],
        "exam_id": exam_id,
        "category": category,
        "reason": reason,
        "proof_link": proof_link,
        "preferred_time": preferred_time_dt,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    reschedule_collection.insert_one(doc)
    
    log_activity(
        actor_id=user["sub"],
        actor_name=user.get("name", "Student"),
        role="student",
        action="Reschedule Requested",
        details=f"Student requested to reschedule exam '{exam.get('exam_name')}' to {preferred_time_dt.isoformat()}."
    )
    
    from app.routes.notification_routes import notify_admins
    notify_admins(
        title="Student Reschedule Request",
        message=f"Student {user.get('name', user['sub'])} requested to reschedule '{exam.get('exam_name')}'.",
        link="/admin"
    )
    
    return {"message": "Reschedule request submitted successfully."}

@router.get("/reschedule-requests/all")
def get_reschedule_requests(
    status: str = Query("all"),
    user=Depends(require_role("admin"))
):
    query = {}
    if status != "all":
        query["status"] = status
    requests = list(reschedule_collection.find(query).sort("created_at", -1))
    for req in requests:
        req["_id"] = str(req["_id"])
        
        # Hydrate exam info
        exam = exam_collection.find_one({"_id": ObjectId(req["exam_id"])})
        if exam:
            req["exam_name"] = exam.get("exam_name", "Unknown Exam")
            req["original_time"] = exam.get("start_time")
            
        # Fix timezone serialization
        if "preferred_time" in req and isinstance(req["preferred_time"], datetime):
            req["preferred_time"] = req["preferred_time"].replace(tzinfo=timezone.utc).isoformat()
        if "original_time" in req and isinstance(req["original_time"], datetime):
            req["original_time"] = req["original_time"].replace(tzinfo=timezone.utc).isoformat()
            
    return {"requests": requests}

@router.delete("/reschedule-requests/{request_id}")
def delete_reschedule_request(
    request_id: str,
    user=Depends(require_role("admin"))
):
    result = reschedule_collection.delete_one({"_id": ObjectId(request_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Request not found")
    return {"message": "Request deleted"}

@router.put("/reschedule-requests/{request_id}")
def update_reschedule_request(
    request_id: str,
    payload: dict,
    user=Depends(require_role("admin"))
):
    status = payload.get("status")
    if status not in ["approved", "rejected"]:
        raise HTTPException(400, "Invalid status")
        
    req = reschedule_collection.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(404, "Request not found")
        
    admin_feedback = payload.get("admin_feedback", "")
    admin_email = user.get("email", "admin@evalis.com")
    
    update_data = {
        "status": status, 
        "updated_at": datetime.utcnow()
    }
    
    if status == "rejected":
        if not admin_feedback:
            raise HTTPException(400, "Admin feedback is required for rejection.")
        update_data["admin_feedback"] = admin_feedback
        update_data["admin_email"] = admin_email
        
    reschedule_collection.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": update_data}
    )
    
    # Notify Student
    exam = exam_collection.find_one({"_id": ObjectId(req["exam_id"])})
    exam_name = exam.get("exam_name", "Unknown Exam") if exam else "Unknown Exam"
    
    if status == "rejected":
        notification_collection.insert_one({
            "user_id": req["student_id"],
            "title": "Reschedule Request Rejected",
            "message": f"Your reschedule request for {exam_name} was rejected. Reason: {admin_feedback}. Contact {admin_email} for questions.",
            "type": "alert",
            "is_read": False,
            "created_at": datetime.utcnow()
        })
    elif status == "approved":
        notification_collection.insert_one({
            "user_id": req["student_id"],
            "title": "Reschedule Request Approved",
            "message": f"Your reschedule request for {exam_name} has been approved!",
            "type": "alert",
            "is_read": False,
            "created_at": datetime.utcnow()
        })
    
    # 🔥 Add the override to the exam document if approved
    if status == "approved":
        exam_collection.update_one(
            {"_id": ObjectId(req["exam_id"])},
            {"$push": {
                "overrides": {
                    "student_id": req["student_id"],
                    "new_start_time": req["preferred_time"]
                }
            }}
        )
    
    # Send push notification
    if status == "rejected":
        send_expo_push(req["student_id"], "Reschedule Request Rejected", f"Your reschedule request for {exam_name} was rejected.")
    elif status == "approved":
        send_expo_push(req["student_id"], "Reschedule Request Approved", f"Your reschedule request for {exam_name} has been approved!")
    
    student_data = user_collection.find_one({"sub": req["student_id"]}) or user_collection.find_one({"email": req["student_id"]})
    to_email = student_data.get("email") if student_data else req["student_id"]
    
    if to_email:
        time_str = req["preferred_time"] if status == "approved" else None
        if time_str and isinstance(time_str, datetime):
            time_str = time_str.replace(tzinfo=timezone.utc).isoformat()
        send_reschedule_status_email(to_email, exam_name, status, time_str)
    
    return {"message": f"Request {status} successfully"}


# ==========================
# 🔥 PHASE 6.4: GRACE MARKING OVEERRIDE
# ==========================
@router.put("/{exam_id}/grace-mark")
def apply_grace_marks(
    exam_id: str,
    payload: GraceMarkRequest,
    user=Depends(require_role("admin"))
):
    try:
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            raise HTTPException(404, "Exam not found")

        sets = exam.get("sets", {})
        if not sets:
            raise HTTPException(400, "No randomized sets mapped to this exam")

        # 1. Isolate WHICH Sets physically contained the broken Question ID
        affected_sets = []
        for set_label, sections in sets.items():
            for sec in sections:
                for q in sec.get("questions", []):
                    if str(q.get("_id")) == payload.question_id or str(q.get("id")) == payload.question_id:
                        affected_sets.append(set_label)
                        break

        if not affected_sets:
            raise HTTPException(404, f"Question {payload.question_id} was not generated inside any Set loops for Exam {exam_id}.")

        # 2. Iterate through specific submissions mathematically matching the affected Sets
        submissions = list(exam_submission_collection.find({"exam_id": exam_id, "assigned_set": {"$in": affected_sets}}))
        
        if not submissions:
            return {"message": "No submissions found resolving to the affected sets.", "updated_count": 0}

        updated_count = 0
        for sub in submissions:
            # Current Tracking
            current_total = sub.get("total_score", 0)
            current_grace = sub.get("grace_marks_awarded", 0)

            # Assign points purely over the limits (+X)
            new_grace = current_grace + payload.marks_to_add
            new_total = current_total + payload.marks_to_add

            exam_submission_collection.update_one(
                {"_id": ObjectId(sub["_id"])},
                {
                    "$set": {
                        "grace_marks_awarded": new_grace,
                        "total_score": new_total
                    }
                }
            )
            updated_count += 1
            
        return {
            "message": "Grace marking systematically resolved",
            "affected_sets": affected_sets,
            "bonus_points_awarded": payload.marks_to_add,
            "total_students_updated": updated_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================
# 🚀 MOCK TEST GENERATOR
# ==========================
from app.schemas.exam_schema import MockTestGeneratePayload

@router.post("/mock-tests/generate")
def generate_mock_test(payload: MockTestGeneratePayload, user=Depends(get_current_user)):
    # 1. Base constraints
    if payload.pattern == "mixed":
        mcq_count = 30 if payload.duration_preset == "Midsem" else 60
        coding_count = 2 if payload.duration_preset == "Midsem" else 4
    else: # mcq
        mcq_count = 50 if payload.duration_preset == "Midsem" else 100
        coding_count = 0
        
    duration = 90 if payload.duration_preset == "Midsem" else 180

    # Expand topics to handle both string/int and prefixed strings ("Unit 1", etc.)
    expanded_topics = []
    for t in payload.topics:
        expanded_topics.append(t)
        if t.isdigit():
            expanded_topics.append(int(t))
            expanded_topics.append(f"Unit {t}")
            expanded_topics.append(f"Chapter {t}")

    # 2. Aggregation pipeline against mock collection (isolated from real exam questions)
    mcq_pipeline = [
        {"$match": {
            "subject_code": payload.subject_code,
            "unit": {"$in": expanded_topics}, 
            "type": "mcq"
        }},
        {"$sample": {"size": mcq_count}}
    ]
    coding_pipeline = [
        {"$match": {
            "subject_code": payload.subject_code,
            "unit": {"$in": expanded_topics}, 
            "type": "coding"
        }},
        {"$sample": {"size": coding_count}}
    ]

    mcqs = list(mock_question_collection.aggregate(mcq_pipeline))
    codings = list(mock_question_collection.aggregate(coding_pipeline))

    for m in mcqs:
        m["id"] = str(m.pop("_id", uuid.uuid4()))
        m["marks"] = 1 # Override to 1 mark
    for c in codings:
        c["id"] = str(c.pop("_id", uuid.uuid4()))
        c["marks"] = 10 # Override to 10 marks

    sections = []
    if mcqs:
        sections.append({
            "type": "mcq",
            "count": len(mcqs),
            "marks_per_question": 1,
            "questions": mcqs
        })
    if codings:
        sections.append({
            "type": "coding",
            "count": len(codings),
            "marks_per_question": 10,
            "questions": codings
        })

    if not sections:
        raise HTTPException(status_code=400, detail="No questions found for the selected chapters. Please try different chapters.")

    # Calculate total dynamic marks
    total_marks = (len(mcqs) * 1) + (len(codings) * 10)

    # 3. Handle Scheduling Mode
    start_time = datetime.now(timezone.utc) if payload.start_mode == "instant" else payload.scheduled_time

    # 4. Create Exam Object
    exam_doc = {
        "exam_name": f"Mock: {payload.subject_code} (Ch: {', '.join(payload.topics)})",
        "subject": "Data Structures using C",
        "course_code": payload.subject_code,
        "exam_type": "Practice",
        "status": "published",
        "duration_minutes": duration,
        "total_marks": total_marks,
        "start_time": start_time,
        "is_instant": payload.start_mode == "instant",
        "created_by": user["sub"],
        "teacher_name": "System Generator",
        "sections": sections,
        "assigned_to": [user["sub"]],
        "created_at": datetime.now(timezone.utc)
    }

    result = past_papers_collection.insert_one(exam_doc)

    if payload.start_mode == "scheduled" and payload.scheduled_time:
        send_mock_scheduled_email(user["sub"], exam_doc["exam_name"], str(payload.scheduled_time), is_reminder=False)

    return {
        "message": "Mock test generated successfully",
        "exam_id": str(result.inserted_id)
    }

class SchedulePastPaperPayload(BaseModel):
    scheduled_time: datetime

@router.post("/mock-tests/schedule-past-paper/{paper_id}")
async def schedule_past_paper(paper_id: str, payload: SchedulePastPaperPayload, user = Depends(get_current_user)):
    try:
        from bson import ObjectId
        paper = past_papers_collection.find_one({"_id": ObjectId(paper_id)})
        if not paper:
            raise HTTPException(status_code=404, detail="Past paper not found")
            
        # clone it
        del paper["_id"]
        paper["exam_type"] = "Practice"
        paper["is_instant"] = False
        paper["start_time"] = payload.scheduled_time
        paper["assigned_to"] = [user["sub"]]
        paper["created_at"] = datetime.now(timezone.utc)
        
        result = past_papers_collection.insert_one(paper)
        
        send_mock_scheduled_email(user["sub"], paper.get("exam_name", "Past Paper Mock"), str(payload.scheduled_time), is_reminder=False)
        
        return {
            "message": "Past paper scheduled successfully",
            "exam_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
