from fastapi import APIRouter, HTTPException
from app.database import db, question_collection
from app.models.curriculum_model import Curriculum

router = APIRouter()

# =========================
# ➕ CREATE CURRICULUM
# =========================
@router.post("/")
def create_curriculum(curriculum: Curriculum):
    data = curriculum.dict()

    existing = db.curriculum.find_one({"semester": curriculum.semester})
    if existing:
        return {"message": "Curriculum already exists"}

    result = db.curriculum.insert_one(data)

    return {
        "message": "Curriculum added successfully",
        "id": str(result.inserted_id)
    }


# =========================
# 📥 GET CURRICULUM (FIXED 🔥)
# =========================
@router.get("/{semester}")
def get_curriculum(semester: int):

    # ✅ FIRST: try curriculum collection
    curriculum = db.curriculum.find_one({"semester": semester})

    if curriculum:
        curriculum["_id"] = str(curriculum["_id"])
        return curriculum

    # 🔥 FALLBACK: build from questions collection
    pipeline = [
        {"$match": {"semester": semester}},
        {
            "$group": {
                "_id": {
                    "subject_code": "$subject_code",
                    "subject_name": "$subject_name",
                    "unit": "$unit",
                    "topic": "$topic"
                }
            }
        }
    ]

    data = list(question_collection.aggregate(pipeline))

    if not data:
        return {
            "semester": semester,
            "subjects": []
        }

    curriculum_map = {}

    for item in data:
        sub_code = item["_id"]["subject_code"]
        sub_name = item["_id"]["subject_name"]
        unit = item["_id"]["unit"]
        topic = item["_id"]["topic"]

        if sub_code not in curriculum_map:
            curriculum_map[sub_code] = {
                "name": sub_name,
                "code": sub_code,
                "units": {}
            }

        if unit not in curriculum_map[sub_code]["units"]:
            curriculum_map[sub_code]["units"][unit] = {
                "unit_number": unit,
                "topics": []
            }

        curriculum_map[sub_code]["units"][unit]["topics"].append({
            "name": topic
        })

    subjects = []

    for sub in curriculum_map.values():
        units = list(sub["units"].values())
        subjects.append({
            "name": sub["name"],
            "code": sub["code"],
            "units": units
        })

    return {
        "semester": semester,
        "subjects": subjects
    }


# =========================
# ✏️ UPDATE CURRICULUM
# =========================
@router.put("/{semester}")
def update_curriculum(semester: int, curriculum: Curriculum):

    if curriculum.semester != semester:
        return {"message": "Semester mismatch"}

    existing = db.curriculum.find_one({"semester": semester})

    if not existing:
        return {"message": "Curriculum not found"}

    db.curriculum.update_one(
        {"semester": semester},
        {"$set": curriculum.dict()}
    )

    return {"message": "Curriculum updated successfully"}