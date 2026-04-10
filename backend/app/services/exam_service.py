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

def get_questions_smart(filter_query: Dict, count: int, used_ids: set):
    if count <= 0: return []
    questions = list(question_collection.find(filter_query))

    print(f"\n🔍 FILTER: {filter_query}")
    
    # Exclude globally used_ids
    available = [q for q in questions if str(q["_id"]) not in used_ids]
    print(f"📊 FOUND: {len(questions)} | AVAILABLE: {len(available)} | NEED: {count}")

    for q in available:
        score = 0
        # Penalize usage
        score -= (q.get("usage_count", 0) * 10)
        # Randomness factor
        score += random.uniform(0, 5)
        q["smart_score"] = score

    available.sort(key=lambda x: x["smart_score"], reverse=True)

    selected = available[:count]
    for q in selected:
        used_ids.add(str(q["_id"]))

    return selected


# ==============================
# MAIN GENERATOR
# ==============================

def generate_exam(data, seed_sections=None):
    if seed_sections is None:
        seed_sections = []
        
    exam_type = data.exam_type.lower()
    pattern = data.pattern.lower()

    if exam_type not in MIET_RULES:
        raise ValueError("Invalid exam type")

    if pattern not in MIET_RULES[exam_type]:
        raise ValueError("Invalid pattern")

    rules = MIET_RULES[exam_type][pattern]

    # 🔥 normalized units
    units = normalize_units(data.units)

    sets_result = {"A": [], "B": [], "C": [], "D": []}
    
    # 1. Distribute Teacher's Seed Pool
    flattened_seed = []
    for sec in seed_sections:
        if "questions" in sec:
            flattened_seed.extend(sec["questions"])
            
    random.shuffle(flattened_seed)
    num_sets = 4
    set_keys = ["A", "B", "C", "D"]
    
    if flattened_seed:
        share = len(flattened_seed) // num_sets
        for i, key in enumerate(set_keys):
            st = i * share
            en = st + share
            if i == num_sets - 1:
                sets_result[key].extend(flattened_seed[st:])
            else:
                sets_result[key].extend(flattened_seed[st:en])
                
    # Keep track of globally used IDs to avoid cross-contamination from DB padding
    global_used_ids = set([str(q["_id"]) for q in flattened_seed])
    
    final_sets = {}

    # 2. Procedural Padding for each Set
    for key in set_keys:
        current_seed_questions = sets_result[key]
        result_sections = []

        # ==========================
        # MCQ
        # ==========================
        if "mcq_count" in rules:
            target_mcq = rules["mcq_count"]
            current_mcq = [q for q in current_seed_questions if q.get("question_type") == "mcq" or q.get("type") == "mcq"]
            
            mcqs = []
            # Inject seeds
            mcqs.extend([question_helper(q) for q in current_mcq])
            
            deficiency = target_mcq - len(mcqs)
            if deficiency > 0:
                mcq_filter = build_filter({"unit": {"$in": units}, "question_type": "mcq"}, data)
                new_mcqs_raw = get_questions_smart(mcq_filter, deficiency, global_used_ids)
                mcqs.extend([question_helper(q) for q in new_mcqs_raw])

            if mcqs:
                result_sections.append({
                    "type": "mcq",
                    "count": len(mcqs),
                    "marks_per_question": 1,
                    "questions": mcqs
                })

        # ==========================
        # CODING
        # ==========================
        coding_questions = []
        current_coding = [q for q in current_seed_questions if q.get("question_type") == "coding" or q.get("type") == "coding"]
        coding_questions.extend([question_helper(q) for q in current_coding])

        if "coding_distribution" in rules:
            for difficulty, count in rules["coding_distribution"].items():
                current_diff = [q for q in current_coding if q.get("difficulty") == difficulty]
                deficiency = count - len(current_diff)
                
                if deficiency > 0:
                    coding_filter = build_filter({"unit": {"$in": units}, "question_type": "coding", "difficulty": difficulty}, data)
                    new_qs_raw = get_questions_smart(coding_filter, deficiency, global_used_ids)
                    coding_questions.extend([question_helper(q) for q in new_qs_raw])
                    
        elif "coding_total" in rules:
            deficiency = rules["coding_total"] - len(current_coding)
            if deficiency > 0:
                coding_filter = build_filter({"unit": {"$in": units}, "question_type": "coding"}, data)
                new_qs_raw = get_questions_smart(coding_filter, deficiency, global_used_ids)
                coding_questions.extend([question_helper(q) for q in new_qs_raw])

        seen = set()
        dedup_coding = []
        for cq in coding_questions:
            c_id = str(cq["_id"])
            if c_id not in seen:
                seen.add(c_id)
                dedup_coding.append(cq)

        if dedup_coding:
            result_sections.append({
                "type": "coding",
                "count": len(dedup_coding),
                "questions": dedup_coding
            })

        final_sets[key] = result_sections

    # Count total from Set A just as a baseline
    total_questions = sum(s["count"] for s in final_sets["A"])

    return {
        "message": "Questions generated successfully",
        "question_count": total_questions,
        "exam": {
            "exam_type": exam_type,
            "pattern": pattern,
            "total_marks": MIET_RULES[exam_type]["total_marks"],
            "sets": final_sets
        }
    }