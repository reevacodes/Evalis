import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(r"c:\Projects\Evalis\backend")
load_dotenv(r"c:\Projects\Evalis\backend\.env")

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME", "evalis_db")]
col = db["mock_question_collection"]

print("Grouping mock questions by semester, subject, unit, and type...")
pipeline = [
    {
        "$group": {
            "_id": {
                "semester": "$semester",
                "subject_code": "$subject_code",
                "unit": "$unit",
                "type": "$type"
            },
            "count": {"$sum": 1}
        }
    },
    {"$sort": {"_id.semester": 1, "_id.subject_code": 1, "_id.unit": 1, "_id.type": 1}}
]

for doc in col.aggregate(pipeline):
    info = doc["_id"]
    print(f"Sem: {info.get('semester')} | Sub: {info.get('subject_code')} | Unit: {info.get('unit')} | Type: {info.get('type')} => Count: {doc['count']}")
