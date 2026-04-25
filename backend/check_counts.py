import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]
coll = db["mock_question_collection"]

pipeline = [
    {
        "$group": {
            "_id": {"subject": "$subject_code", "unit": "$unit", "type": "$type"},
            "count": {"$sum": 1}
        }
    },
    {
        "$sort": {"_id.subject": 1, "_id.unit": 1, "_id.type": 1}
    }
]

results = list(coll.aggregate(pipeline))

print("\nMock Database Question Counts:")
print("-" * 45)

if not results:
    print("Database is completely empty!")

current_sub = None
current_unit = None

for r in results:
    sub = r["_id"].get("subject", "Unknown")
    unit = r["_id"].get("unit", "Unknown")
    qtype = r["_id"].get("type", "Unknown").upper()
    count = r["count"]
    
    if sub != current_sub or unit != current_unit:
        print(f"\n{sub} - Chapter {unit}")
        current_sub = sub
        current_unit = unit
        
    print(f"   - {qtype}: {count}")

print("-" * 45)
print("Finished!")
