from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from datetime import datetime, timedelta,timezone
from app.services.exam_service import MIET_RULES

from app.schemas.exam_schema import ExamGenerateRequest, ExamCreateRequest
from app.services.exam_service import generate_exam
from app.database import exam_collection, question_collection
from app.models.question_model import question_helper
from app.services.exam_service import generate_exam
from fastapi import Depends
from app.utils.auth_dependency import get_current_user, require_role

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
            "teacher_name": user["sub"],  # 🔥 FIXED (no frontend trust)
            "semester": int(data.semester),
            "exam_type": exam_type,
            "pattern": pattern,
            "units": data.units,
            "duration_minutes": int(data.duration_minutes),

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

        # 🔥 Secure update (no frontend trust)
        updated_data = {
            "exam_name": data.exam_name,
            "subject_code": data.subject_code,
            "teacher_name": user["sub"],  # 🔐 FIXED
            "semester": int(data.semester) if data.semester else None,
            "exam_type": data.exam_type,
            "pattern": data.pattern,
            "units": data.units,
            "duration_minutes": int(data.duration_minutes) if data.duration_minutes else 30,
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
        generated = generate_exam(data)
        sections = generated["exam"]["sections"]

        # ==========================
        # 🔥 SAVE INTO DB
        # ==========================
        exam_collection.update_one(
            {"_id": ObjectId(data.exam_id)},
            {
                "$set": {
                    "sections": sections,
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

            if exam.get("status") != "draft":
                raise HTTPException(
                    status_code=400,
                    detail="Teachers can only delete draft exams"
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
# 🔥 TIME STATUS HELPER
# ==========================
def calculate_exam_state(exam):
    if not exam.get("start_time"):
        return "unscheduled"

    now = datetime.now()

    start = exam["start_time"]

    if start.tzinfo is None:
        start = start
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
            exams = list(exam_collection.find({"is_deleted": {"$ne": True}}).sort("created_at", -1))

        elif role == "teacher":
            exams = list(
                exam_collection.find({"teacher_name": user["sub"], "is_deleted": {"$ne": True}})
                .sort("created_at", -1)
            )

        elif role == "student":   # ✅ ADD THIS BLOCK
            exams = list(
                exam_collection.find({"status": "published", "is_deleted": {"$ne": True}})
                .sort("created_at", -1)
            )

        else:
            raise HTTPException(403, "Not authorized")

        for exam in exams:
            exam["_id"] = str(exam["_id"])
            exam["time_status"] = calculate_exam_state(exam)
            exam.pop("sections", None)

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

    # ✅ SAVE
    exam_collection.update_one(
        {"_id": ObjectId(exam_id)},
        {
            "$set": {
                "start_time": start_time,
                "duration_minutes": duration,
                "scheduled_at": datetime.now(timezone.utc),
                "schedule_requested": False,   # reset flag
                "scheduled_by": user["sub"]    # 🔥 ADD HERE
            }
        }
    )

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
    exam["time_status"] = calculate_exam_state(exam)

    role = user.get("role")

    # ==========================
    # 👨‍🎓 STUDENT RESTRICTIONS
    # ==========================
    if role == "student":
        if exam.get("status") != "published":
            raise HTTPException(403, "Exam not available")

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
        now = datetime.now()
        start = exam.get("start_time")

        if start:
            if start.tzinfo is None:
                start = start

            end = start + timedelta(minutes=exam.get("duration_minutes", 30))
            remaining = (end - now).total_seconds()
            exam["time_left"] = max(0, int(remaining))

    return exam


# ==========================
# 🔥 PUBLISH
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

    return {"message": "Exam published successfully"}


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
    payload: dict,
    user=Depends(require_role("teacher"))
):
    try:
        section_index = payload.get("section_index")
        question_ids = payload.get("question_ids", [])

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
                
        # Push to array
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
    payload: dict,
    user=Depends(require_role("teacher"))
):
    try:
        section_index = payload.get("section_index")
        question_index = payload.get("question_index")

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

        if question_index >= len(sections[section_index]["questions"]):
            raise HTTPException(status_code=400, detail="Invalid question index")

        # 🔥 REMOVE QUESTION
        sections[section_index]["questions"].pop(question_index)

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
def request_schedule(exam_id: str, user=Depends(require_role("teacher"))):
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

    exam_collection.update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {"schedule_requested": True}}
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

    return {"message": "Unlock request sent"}