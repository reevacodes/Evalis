from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from app.database import past_papers_collection, practice_attempts_collection
from app.utils.auth_dependency import get_current_user, require_role
from app.schemas.exam_schema import SubmissionRequest
from bson import ObjectId
from datetime import datetime, timezone
from app.services.evaluation_service import async_evaluate_practice_submission
import random
from app.services.email_service import send_mock_scheduled_email
from pydantic import BaseModel

router = APIRouter()

# ==========================
# 🔥 GET ALL PAST PAPERS
# ==========================
@router.get("/")
def get_all_past_papers(user=Depends(get_current_user)):
    try:
        # Fetch standard curriculum papers AND practice mocks specifically created/scheduled by this user
        query = {
            "$or": [
                {"exam_type": {"$ne": "Practice"}},
                {"$and": [
                    {"exam_type": "Practice"},
                    {"$or": [
                        {"scheduled_by": user.get("sub")},
                        {"created_by": user.get("sub")}
                    ]}
                ]}
            ]
        }
        papers = list(past_papers_collection.find(query).sort("year", -1))
        
        # Strip massive payloads (sections) for the listing
        for p in papers:
            p["_id"] = str(p["_id"])
            p.pop("sections", None)
            p.pop("sets", None)

        return papers
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve past papers")


# ==========================
# 🔥 GET PRACTICE HISTORY
# ==========================
@router.get("/practice/history")
def get_practice_history(user=Depends(get_current_user)):
    try:
        attempts = list(practice_attempts_collection.find({"user_id": user["sub"]}).sort("created_at", -1))
        
        # Enrich with exam names
        for a in attempts:
            a["_id"] = str(a["_id"])
            paper = past_papers_collection.find_one({"_id": ObjectId(a["paper_id"])}, {"exam_name": 1})
            a["exam_name"] = paper.get("exam_name", "Unknown Practice Paper") if paper else "Unknown Practice Paper"
            
        return attempts
    except Exception as e:
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve history")

# ==========================
# 🔥 GET SINGLE PAST PAPER
# ==========================
@router.get("/{paper_id}")
def get_single_past_paper(
    paper_id: str,
    selected_set: str = Query("A", description="Which set to practice: A, B, C, or D"),
    user=Depends(get_current_user)
):
    try:
        paper = past_papers_collection.find_one({"_id": ObjectId(paper_id)})
        
        if not paper:
            raise HTTPException(status_code=404, detail="Past paper not found")
            
        paper["_id"] = str(paper["_id"])
        
        # ✅ FLAG FOR FRONTEND CONDITIONAL BRANCHING
        paper["mode"] = "practice"
        
        # Extract sections cleanly if it's stored in sets format
        if "sets" in paper and paper["sets"]:
            set_choice = selected_set.upper() if selected_set.upper() in paper["sets"] else "A"
            paper["sections"] = paper["sets"].get(set_choice, [])
            paper["selected_set"] = set_choice
            paper["available_sets"] = list(paper["sets"].keys())
            paper.pop("sets", None)

        return paper
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve past paper: {str(e)}")


# ==========================
# 🔥 SCHEDULE PAST PAPER
# ==========================
from pydantic import BaseModel
class SchedulePastPaperRequest(BaseModel):
    scheduled_time: datetime

@router.post("/{paper_id}/schedule")
def schedule_past_paper(
    paper_id: str,
    payload: SchedulePastPaperRequest,
    user=Depends(get_current_user)
):
    try:
        original_paper = past_papers_collection.find_one({"_id": ObjectId(paper_id)})
        if not original_paper:
            raise HTTPException(status_code=404, detail="Past paper not found")

        exam_doc = {
            **original_paper,
            "_id": ObjectId(),
            "exam_name": f"Scheduled Mock: {original_paper.get('exam_name')}",
            "exam_type": "Practice",
            "status": "published",
            "start_time": payload.scheduled_time,
            "is_instant": False,
            "created_by": user["sub"],
            "teacher_name": "System Generator",
            "assigned_to": [user["sub"]],
            "created_at": datetime.now(timezone.utc)
        }

        # Clear Original ID to avoid collision
        result = past_papers_collection.insert_one(exam_doc)

        send_mock_scheduled_email(user["sub"], exam_doc["exam_name"], str(payload.scheduled_time), is_reminder=False)

        return {
            "message": "Past paper mock test scheduled successfully",
            "exam_id": str(result.inserted_id)
        }

    except Exception as e:
        print("🔥 SCHEDULE PAST PAPER ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to schedule past paper")

# ==========================
# 🔥 SUBMIT PRACTICE ATTEMPT
# ==========================
@router.post("/{paper_id}/practice-attempts")
def submit_practice_attempt(
    paper_id: str,
    payload: SubmissionRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user)
):
    try:
        paper = past_papers_collection.find_one({"_id": ObjectId(paper_id)})
        if not paper:
            raise HTTPException(status_code=404, detail="Past paper not found")

        # Get the sections array
        assigned_sections = paper.get("sections", [])
        if not assigned_sections and "sets" in paper:
            assigned_sections = paper["sets"].get("A", [])

        # ================================
        # REUSED EVALUATION LOGIC
        # ================================
        mcq_section = next((s for s in assigned_sections if s["type"] == "mcq"), None)
        mcq_score = 0
        correct_count = 0
        topic_stats = {}
        total_mcqs = 0
        attempted_mcqs = 0
        
        # Fast coding placeholder metric (background worker bypassed strictly for practice speed natively)
        coding_results = {"status": "pending_manual_review_or_execution"}

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
            "topic_breakdown": topic_stats,
            "time_spent_mcq": payload.time_spent_mcq,
            "time_spent_coding": payload.time_spent_coding,
            "time_spent_total": payload.time_spent_total
        }

        # Save to optional practice_attempts collection
        practice_doc = {
            "user_id": user.get("sub"),
            "paper_id": paper_id,
            "score": mcq_score,
            "analytics": analytics,
            "mcq_answers": payload.mcq_answers,
            "coding_answers": payload.coding_answers,
            "tab_switches": payload.tab_switches,
            "cv_violations": payload.cv_violations,
            "coding_results": coding_results,
            "created_at": datetime.now(timezone.utc)
        }
        
        practice_attempts_collection.insert_one(practice_doc)
        
        practice_id_str = str(practice_doc.get("_id"))
        
        # 🔥 FIRE MOCK EXAM EVALUATOR (Synchronously for instant feedback)
        final_score = mcq_score
        final_analytics = analytics
        if len(payload.coding_answers) > 0:
            from app.services.evaluation_service import async_evaluate_practice_submission
            async_evaluate_practice_submission(practice_id_str)
            updated_practice = practice_attempts_collection.find_one({"_id": ObjectId(practice_id_str)})
            if updated_practice:
                if updated_practice.get("coding_results"):
                    coding_results = updated_practice.get("coding_results")
                final_score = updated_practice.get("score", mcq_score)
                final_analytics = updated_practice.get("analytics", analytics)

        try:
            from app.database import user_collection
            from app.services.email_service import send_analytics_report_email
            student = user_collection.find_one({"email": user.get("sub")})
            student_name = student.get("name", "Student") if student else "Student"
            send_analytics_report_email(
                to_email=user.get("sub"),
                name=student_name,
                exam_name=paper.get("exam_name", "Mock Test"),
                score=final_score,
                analytics=final_analytics,
                is_mock=True
            )
        except Exception as email_err:
            print("Failed to send mock analytics email:", email_err)

        # Return instantly to the Client Result Page wrapper
        return {
            "score": final_score,
            "analytics": final_analytics,
            "coding_results": coding_results,
            "exam_sections": assigned_sections,
            "mcq_answers": payload.mcq_answers,
            "coding_answers": payload.coding_answers,
            "timeTaken": "N/A" # Optionally track in frontend and pass through payload
        }

    except Exception as e:
        print("🔥 PRACTICE SUBMIT ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to evaluate practice attempt")

# ==========================
# 🔥 UPLOAD PAST PAPER JSON
# ==========================
@router.post("/upload/json")
def upload_past_paper_json(
    payload: dict,
    user=Depends(require_role("admin"))
):
    try:
        # Expected Payload shape:
        # {
        #   "exam_name": "...", "subject_code": "...", "semester": 4,
        #   "year": 2021, "exam_type": "MST", "pattern": "MCQ",
        #   "duration_minutes": 60, "sections": [...]
        # }
        
        # 1. Structural Validation
        required_keys = ["exam_name", "subject_code", "semester", "year", "exam_type", "pattern", "sections"]
        for key in required_keys:
            if key not in payload:
                raise HTTPException(status_code=400, detail=f"Missing required field: {key}")

        # 2. Force normalizations to ensure mobile app UI groupings don't break
        payload["exam_type"] = payload["exam_type"].strip().lower()
        payload["pattern"] = payload["pattern"].strip().lower()

        # 3. Direct DB Injection
        past_papers_collection.insert_one(payload)
        
        return {"message": "Success! Navigable Past Paper injected."}

    except Exception as e:
        print(f"🔥 PAST PAPER UPLOAD ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload past paper structure.")

# ==========================
# 🔥 ARCHIVE OFFICIAL EXAM TO PAST PAPERS
# ==========================
class ArchiveExamRequest(BaseModel):
    year: int

@router.post("/archive-exam/{exam_id}")
def archive_exam_to_past_papers(
    exam_id: str,
    payload: ArchiveExamRequest,
    user=Depends(require_role("admin"))
):
    try:
        from app.database import exam_collection
        from app.services.activity_service import log_activity
        
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
            
        sets = exam.get("sets")
        if not sets:
            # JIT generate sets using generate_exam
            from app.services.exam_service import generate_exam
            generated = generate_exam(
                subject_code=exam.get("subject_code"),
                semester=exam.get("semester"),
                exam_type=exam.get("exam_type", "mst"),
                pattern=exam.get("pattern"),
                units=exam.get("units", []),
                seed_sections=exam.get("sections", []),
            )
            sets = generated["exam"]["sets"]

        # Check if already exists in past papers
        existing = past_papers_collection.find_one({"original_exam_id": exam_id})
        if existing:
            raise HTTPException(status_code=400, detail="This exam has already been added to past papers.")

        past_paper_doc = {
            "exam_name": f"{exam.get('exam_name')} [{exam.get('exam_type').upper()}]",
            "subject_code": exam.get("subject_code"),
            "semester": exam.get("semester"),
            "year": payload.year,
            "exam_type": exam.get("exam_type"),
            "pattern": exam.get("pattern"),
            "duration_minutes": exam.get("duration_minutes", 60),
            "sets": sets,
            "original_exam_id": exam_id,
            "created_at": datetime.now(timezone.utc)
        }
        
        result = past_papers_collection.insert_one(past_paper_doc)
        
        # Log activity
        log_activity(
            actor_id=user["sub"],
            actor_name=user.get("name", "Admin"),
            role="admin",
            action="Exam Archived to Past Papers",
            details=f"Admin archived exam '{exam.get('exam_name')}' to past papers for year {payload.year}."
        )
        
        return {
            "message": "Exam archived to past papers successfully",
            "paper_id": str(result.inserted_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print("🔥 ARCHIVE EXAM ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to archive exam to past papers")
