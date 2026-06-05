import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(r"c:\Projects\Evalis\backend")
load_dotenv(r"c:\Projects\Evalis\backend\.env")

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME", "evalis_db")]
col = db["mock_question_collection"]

# Query Sem 1, COM-101, Unit 1 mock questions
conditions = [
    {"semester": 1},
    {"subject_code": "COM-101"}
]
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
results = list(col.find(query).sort("created_at", -1))

print(f"Total mock questions in database for COM-101 Unit 1: {len(results)}")
for i, r in enumerate(results):
    print(f"#{i+1:<2} | ID: {str(r['_id'])} | Type: {r.get('type') or r.get('question_type')} | Created: {r.get('created_at')} | Text: {r.get('question_text')[:40]}... | Unit in DB: {r.get('unit')}")
