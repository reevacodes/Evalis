import random
from typing import Dict
from app.database import question_collection
from app.models.question_model import question_helper


# ==============================
# RULES
# ==============================

MIET_RULES = {
    "mst": {
        "total_marks": 50,
        "mcq": {"mcq_count": 50},
        "coding": {
            "coding_distribution": {
                "easy": 1,
                "medium": 1,
                "hard": 1
            }
        },
        "mixed": {
            "mcq_count": 20,
            "coding_distribution": {
                "easy": 1,
                "medium": 1,
                "hard": 1
            }
        }
    },
    "final": {
        "total_marks": 100,
        "mcq": {"mcq_count": 100},
        "coding": {"coding_total": 10},
        "mixed": {
            "mcq_count": 60,
            "coding_distribution": {
                "easy": 1,
                "medium": 2,
                "hard": 1
            }
        }
    }
}


# ==============================
# 🔥 NORMALIZATION FUNCTIONS
# ==============================

def normalize_units(units):
    ints = [int(u) for u in units if str(u).isdigit()]
    return ints + [str(u) for u in ints]


def normalize_text(value):
    return value.strip().lower() if value else value


def normalize_subject(value):
    return value.strip().upper() if value else value


# ==============================
# BUILD FILTER
# ==============================

def build_filter(base, data, extra=None):
    query = base.copy()

    # ✅ SUBJECT (case-insensitive via normalization)
    if getattr(data, "subject_code", None):
        query["subject_code"] = normalize_subject(data.subject_code)

    # ✅ QUESTION TYPE
    if getattr(data, "question_type", None):
        query["question_type"] = normalize_text(data.question_type)

    if extra:
        # normalize difficulty if present
        if "difficulty" in extra:
            extra["difficulty"] = normalize_text(extra["difficulty"])
        query.update(extra)

    return query


# ==============================
# FETCH QUESTIONS
# ==============================

def get_questions(filter_query: Dict, count: int, used_ids: set):
    questions = list(question_collection.find(filter_query))

    print("\n🔍 FILTER:", filter_query)
    print("📊 FOUND:", len(questions))

    random.shuffle(questions)

    selected = []
    for q in questions:
        if len(selected) >= count:
            break

        q_id = str(q["_id"])

        if q_id not in used_ids:
            selected.append(q)
            used_ids.add(q_id)

    return selected


# ==============================
# MAIN GENERATOR
# ==============================

def generate_exam(data):
    exam_type = data.exam_type.lower()
    pattern = data.pattern.lower()

    if exam_type not in MIET_RULES:
        raise ValueError("Invalid exam type")

    if pattern not in MIET_RULES[exam_type]:
        raise ValueError("Invalid pattern")

    rules = MIET_RULES[exam_type][pattern]

    # 🔥 normalized units
    units = normalize_units(data.units)

    used_ids = set()

    result = {
        "exam_type": exam_type,
        "pattern": pattern,
        "total_marks": MIET_RULES[exam_type]["total_marks"],
        "sections": []
    }

    # ==========================
    # MCQ
    # ==========================
    if "mcq_count" in rules:
        mcq_filter = build_filter(
            {
                "unit": {"$in": units},
                "question_type": "mcq"
            },
            data
        )

        mcqs_raw = get_questions(mcq_filter, rules["mcq_count"], used_ids)
        mcqs = [question_helper(q) for q in mcqs_raw]

        result["sections"].append({
            "type": "mcq",
            "count": len(mcqs),
            "marks_per_question": 1,
            "questions": mcqs
        })

    # ==========================
    # CODING
    # ==========================
    coding_questions = []

    if "coding_distribution" in rules:
        for difficulty, count in rules["coding_distribution"].items():

            coding_filter = build_filter(
                {
                    "unit": {"$in": units},
                    "question_type": "coding",
                    "difficulty": difficulty
                },
                data
            )

            qs_raw = get_questions(coding_filter, count, used_ids)
            qs = [question_helper(q) for q in qs_raw]

            coding_questions.extend(qs)

    elif "coding_total" in rules:
        coding_filter = build_filter(
            {
                "unit": {"$in": units},
                "question_type": "coding"
            },
            data
        )

        qs_raw = get_questions(coding_filter, rules["coding_total"], used_ids)
        qs = [question_helper(q) for q in qs_raw]

        coding_questions.extend(qs)

    if coding_questions:
        result["sections"].append({
            "type": "coding",
            "count": len(coding_questions),
            "questions": coding_questions
        })

    # ==========================
    # FINAL RESPONSE
    # ==========================
    total_questions = sum(s["count"] for s in result["sections"])

    return {
        "message": "Questions generated successfully",
        "question_count": total_questions,
        "exam": result
    }