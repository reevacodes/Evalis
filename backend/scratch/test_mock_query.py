import os
import sys
import json
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(r"c:\Projects\Evalis\backend")
load_dotenv(r"c:\Projects\Evalis\backend\.env")

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME", "evalis_db")]
col = db["mock_question_collection"]

# Let's perform a mock query for Semester 1, COM-101, Unit 1
print("Querying mock questions for Sem 1, COM-101, Unit 1...")
conditions = [
    {"semester": 1},
    {"subject_code": "COM-101"}
]

# Simulate unit = 1
unit = 1
unit_str = str(unit).strip()
conditions.append({
    "$or": [
        {"unit": int(unit) if unit_str.isdigit() else unit},
        {"unit": unit_str},
        {"unit": {"$regex": f".*\\b{unit_str}\\b.*", "$options": "i"}}
    ]
})

query = {"$and": conditions}
results = list(col.find(query))

print(f"Total found: {len(results)}")
types = {}
for r in results:
    q_type = r.get("type") or r.get("question_type") or "unknown"
    types[q_type] = types.get(q_type, 0) + 1

print("Counts by type:")
for t, count in types.items():
    print(f"  {t}: {count}")

# Print first 2 coding and first 2 mcq if found
print("\n--- Samples ---")
mcqs = [r for r in results if (r.get("type") or r.get("question_type")) == "mcq"]
codings = [r for r in results if (r.get("type") or r.get("question_type")) == "coding"]

print(f"MCQs found: {len(mcqs)}")
for i, q in enumerate(mcqs[:2]):
    print(f"MCQ {i+1}: {q.get('question_text')[:100]} | Unit: {q.get('unit')} | Type: {q.get('type')}")

print(f"\nCodings found: {len(codings)}")
for i, q in enumerate(codings[:2]):
    print(f"Coding {i+1}: {q.get('question_text')[:100]} | Unit: {q.get('unit')} | Type: {q.get('type')}")
