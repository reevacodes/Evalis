from fastapi import APIRouter, Depends, HTTPException
from app.database import past_papers_collection, practice_attempts_collection
from app.utils.auth_dependency import get_current_user, require_role
from app.schemas.exam_schema import SubmissionRequest
from bson import ObjectId
from datetime import datetime, timezone
import random

router = APIRouter()

# ==========================
# 🔥 GET ALL PAST PAPERS
# ==========================
@router.get("/")
def get_all_past_papers(user=Depends(get_current_user)):
    try:
        papers = list(past_papers_collection.find({}).sort("year", -1))
        
        # Strip massive payloads (sections) for the listing
        for p in papers:
            p["_id"] = str(p["_id"])
            p.pop("sections", None)
            p.pop("sets", None)

        return papers
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve past papers")


# ==========================
# 🔥 GET SINGLE PAST PAPER
# ==========================
@router.get("/{paper_id}")
def get_single_past_paper(paper_id: str, user=Depends(get_current_user)):
    try:
        paper = past_papers_collection.find_one({"_id": ObjectId(paper_id)})
        
        if not paper:
            raise HTTPException(status_code=404, detail="Past paper not found")
            
        paper["_id"] = str(paper["_id"])
        
        # ✅ FLAG FOR FRONTEND CONDITIONAL BRANCHING
        paper["mode"] = "practice"
        
        # Extract sections cleanly if it's stored in sets format
        if "sets" in paper and paper["sets"]:
            # Pick set A by default for practice mode
            paper["sections"] = paper["sets"].get("A", [])
            paper.pop("sets", None)

        return paper
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve past paper")


# ==========================
# 🔥 SUBMIT PRACTICE ATTEMPT
# ==========================
@router.post("/{paper_id}/practice-attempts")
def submit_practice_attempt(
    paper_id: str,
    payload: SubmissionRequest,
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
            "topic_breakdown": topic_stats
        }

        # Save to optional practice_attempts collection
        practice_doc = {
            "user_id": user.get("sub"),
            "paper_id": paper_id,
            "score": mcq_score,
            "analytics": analytics,
            "coding_results": coding_results,
            "created_at": datetime.now(timezone.utc)
        }
        
        practice_attempts_collection.insert_one(practice_doc)

        # Return instantly to the Client Result Page wrapper
        return {
            "score": mcq_score,
            "analytics": analytics,
            "coding_results": coding_results,
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
