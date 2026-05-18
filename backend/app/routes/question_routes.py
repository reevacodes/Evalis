from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Form
from typing import Optional, List
from fastapi.encoders import jsonable_encoder
from datetime import datetime
import re
from bson import ObjectId

from app.database import question_collection
from app.schemas.question_schema import Question
from app.models.question_model import question_helper

router = APIRouter()


# =========================
# 🔧 HELPER: SAFE REGEX
# =========================
def build_flexible_query(field, value):
    words = value.strip().split()

    return {
        "$and": [
            {
                field: {
                    "$regex": f".*{re.escape(word)}.*",
                    "$options": "i"
                }
            }
            for word in words
        ]
    }


# =========================
# ➕ ADD SINGLE QUESTION
# =========================
@router.post("/questions")
def add_question(question: Question):
    data = jsonable_encoder(question)

    # 🔥 CLEAN
    data["subject_code"] = data["subject_code"].strip()
    data["subject_name"] = data["subject_name"].strip()
    data["topic"] = data["topic"].strip()
    data["difficulty"] = data["difficulty"].strip()
    data["tags"] = [tag.strip() for tag in data.get("tags", [])]

    data["created_at"] = datetime.utcnow()

    # 🔥 DUPLICATE CHECK
    existing = question_collection.find_one({
        "question_text": {
            "$regex": f"^{re.escape(data['question_text'])}$",
            "$options": "i"
        }
    })

    if existing:
        raise HTTPException(status_code=400, detail="Question already exists")

    result = question_collection.insert_one(data)

    return {
        "message": "Question added successfully",
        "id": str(result.inserted_id)
    }


# =========================
# 📦 BULK ADD QUESTIONS
# =========================
@router.post("/questions/bulk")
def add_bulk_questions(questions: List[Question]):
    inserted_ids = []
    skipped = 0

    for q in questions:
        data = jsonable_encoder(q)

        # 🔥 CLEAN
        data["subject_code"] = data["subject_code"].strip()
        data["subject_name"] = data["subject_name"].strip()
        data["topic"] = data["topic"].strip()
        data["difficulty"] = data["difficulty"].strip()
        data["tags"] = [tag.strip() for tag in data.get("tags", [])]

        data["created_at"] = datetime.utcnow()

        existing = question_collection.find_one({
            "question_text": {
                "$regex": f"^{re.escape(data['question_text'])}$",
                "$options": "i"
            }
        })

        if existing:
            skipped += 1
            inserted_ids.append(str(existing["_id"]))
            continue

        result = question_collection.insert_one(data)
        inserted_ids.append(str(result.inserted_id))

    return {
        "message": "Bulk upload completed",
        "inserted_count": len(inserted_ids),
        "skipped_duplicates": skipped,
        "inserted_ids": inserted_ids
    }

# =========================
# 📦 BULK ADD MOCK QUESTIONS
# =========================
from pydantic import BaseModel
class BulkMockQuestionsPayload(BaseModel):
    subject_code: str
    subject_name: str
    semester: int
    unit: str
    questions: list

from app.database import mock_question_collection

@router.post("/mock-questions/bulk")
def add_bulk_mock_questions(payload: BulkMockQuestionsPayload):
    docs = []
    for q in payload.questions:
        doc = q.copy()
        doc["subject_code"] = payload.subject_code
        doc["subject_name"] = payload.subject_name
        doc["semester"] = payload.semester
        doc["unit"] = payload.unit
        doc["created_at"] = datetime.utcnow()
        if "marks" not in doc:
            doc["marks"] = 10 if doc.get("type") == "coding" else 1
        docs.append(doc)

    if not docs:
        return {"message": "No questions provided", "inserted_count": 0}

    res = mock_question_collection.insert_many(docs)
    return {
        "message": "Bulk upload to mocks completed",
        "inserted_count": len(res.inserted_ids)
    }

# =========================
# 🤖 GENERATE MOCK QUESTIONS VIA RAG (NEW)
# =========================
@router.post("/mock-questions/rag-generate")
async def generate_rag_mock_questions(
    file: UploadFile = File(...),
    subject_code: str = Form(...),
    subject_name: str = Form(...),
    semester: int = Form(...),
    unit: str = Form(...)
):
    from app.services.rag_service import (
        extract_text_from_pdf, chunk_text, get_embeddings, 
        retrieve_top_chunks, generate_rag_questions
    )
    from app.database import mock_question_collection
    
    try:
        pdf_bytes = await file.read()
        text = extract_text_from_pdf(pdf_bytes)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
            
        chunks = chunk_text(text)
        embeddings = get_embeddings(chunks)
        
        query = f"Key concepts, definitions, and code examples for {subject_name} ({subject_code}) Chapter {unit}"
        context = retrieve_top_chunks(query, chunks, embeddings, top_k=5)
        
        # Generate 5 MCQs and 1 Coding question grounded in this context
        questions = generate_rag_questions(subject_name, subject_code, unit, context, mcq_count=5, coding_count=1)
        
        if not questions:
            raise HTTPException(status_code=500, detail="AI failed to generate RAG questions")
            
        for q in questions:
            q["semester"] = semester
            q["created_at"] = datetime.utcnow()
            if "marks" not in q:
                q["marks"] = 10 if q.get("type") == "coding" else 1
                
        res = mock_question_collection.insert_many(questions)
        
        return {
            "message": f"Successfully generated and injected {len(res.inserted_ids)} highly contextual RAG questions.",
            "inserted_count": len(res.inserted_ids),
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# =========================
# 📥 GET QUESTIONS (SMART SEARCH)
# =========================
@router.get("/questions")
def get_questions(
    semester: Optional[int] = None,
    subject: Optional[str] = None,
    unit: Optional[int] = None,
    topic: Optional[str] = None,
    question_type: Optional[str] = None,
    difficulty: Optional[str] = None,
    tags: Optional[str] = Query(None),
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 10
):
    conditions = []

    # -------------------------
    # 🔹 STRUCTURAL FILTERS
    # -------------------------
    if semester is not None:
        conditions.append({"semester": int(semester)})

    if subject:
        conditions.append({"subject_code": subject.strip()})

    if unit is not None:
        try:
            conditions.append({"unit": int(unit)})  # 🔥 FIX
        except:
            pass

    if topic:
        conditions.append({
            "topic": {
                "$regex": f".*{re.escape(topic.strip())}.*",
                "$options": "i"
            }
        })

    if question_type:
        conditions.append({"question_type": question_type})

    if difficulty:
        conditions.append({
            "difficulty": {
                "$regex": f".*{difficulty.strip()}.*",
                "$options": "i"
            }
        })

    # -------------------------
    # 🔹 TAGS
    # -------------------------
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        conditions.append({
            "tags": {
                "$elemMatch": {
                    "$regex": "|".join(tag_list),
                    "$options": "i"
                }
            }
        })

    # -------------------------
    # 🔹 GLOBAL SEARCH
    # -------------------------
    if search:
        conditions.append({
            "$or": [
                {"question_text": {"$regex": search, "$options": "i"}},
                {"topic": {"$regex": search, "$options": "i"}},
                {"subject_name": {"$regex": search, "$options": "i"}},
                {"tags": {"$regex": search, "$options": "i"}},
            ]
        })

    # -------------------------
    # 🔥 FINAL QUERY
    # -------------------------
    query = {"$and": conditions} if conditions else {}

    print("🔥 QUERY:", query)  # DEBUG (important)

    # -------------------------
    # 🔥 PAGINATION
    # -------------------------
    page = max(page, 1)
    limit = min(max(limit, 1), 50)
    skip = (page - 1) * limit

    total = question_collection.count_documents(query)
    total_pages = (total + limit - 1) // limit

    cursor = (
        question_collection
        .find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    questions = [question_helper(q) for q in cursor]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
        "data": questions
    }

@router.delete("/questions/{question_id}")
def delete_question(question_id: str):
    try:
        result = question_collection.delete_one({
            "_id": ObjectId(question_id)
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Question not found")

        return {
            "message": "Question deleted successfully",
            "deleted_count": result.deleted_count
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
@router.put("/auto-assign-marks")
def auto_assign_marks():
    mapping = {
        "easy": 5,
        "medium": 10,
        "hard": 15
    }

    updated_counts = {}

    for diff, marks in mapping.items():
        result = question_collection.update_many(
            {"question_type": "coding", "difficulty": diff},
            {"$set": {"marks": marks}}
        )
        updated_counts[diff] = result.modified_count

    return {
        "message": "Marks assigned successfully",
        "updated": updated_counts
    }

@router.get("/questions/type/{qtype}")
def get_questions_by_type(qtype: str):
    qtype = qtype.strip().lower()

    if qtype not in ["mcq", "coding"]:
        raise HTTPException(status_code=400, detail="Invalid question type")

    cursor = question_collection.find({"question_type": qtype})
    questions = [question_helper(q) for q in cursor]

    return {
        "type": qtype,
        "count": len(questions),
        "data": questions
    }

# =========================
# ✏️ UPDATE QUESTION (NEW)
# =========================
@router.put("/questions/{question_id}")
def update_question(question_id: str, payload: dict):
    try:
        update_data = payload

        # 🔥 CLEAN (same as add)
        if "subject_code" in update_data:
            update_data["subject_code"] = update_data["subject_code"].strip()

        if "subject_name" in update_data:
            update_data["subject_name"] = update_data["subject_name"].strip()

        if "topic" in update_data:
            update_data["topic"] = update_data["topic"].strip()

        if "difficulty" in update_data:
            update_data["difficulty"] = update_data["difficulty"].strip()

        if "tags" in update_data:
            update_data["tags"] = [tag.strip() for tag in update_data.get("tags", [])]

        result = question_collection.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Question not found")

        return {
            "message": "Question updated successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# =========================
# 📄 GET SINGLE QUESTION (NEW)
# =========================
@router.get("/questions/{question_id}")
def get_single_question(question_id: str):
    try:
        question = question_collection.find_one({
            "_id": ObjectId(question_id)
        })

        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        return question_helper(question)

    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid ID format")