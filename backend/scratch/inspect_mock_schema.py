import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(r"c:\Projects\Evalis\backend")
load_dotenv(r"c:\Projects\Evalis\backend\.env")

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME", "evalis_db")]
col = db["mock_question_collection"]

# Inspect a few sample documents
print("--- Sample Documents ---")
samples = list(col.find().limit(5))
for i, sample in enumerate(samples):
    print(f"\nSample {i+1}:")
    print({k: v for k, v in sample.items() if k != "_id" and not isinstance(v, list)})

# Count how many documents have "question_type" vs "type"
count_question_type = col.count_documents({"question_type": {"$exists": True}})
count_type = col.count_documents({"type": {"$exists": True}})
count_both = col.count_documents({"question_type": {"$exists": True}, "type": {"$exists": True}})
total = col.count_documents({})

print("\n--- Field Presence in mock_question_collection ---")
print(f"Total documents: {total}")
print(f"Has 'question_type': {count_question_type}")
print(f"Has 'type': {count_type}")
print(f"Has both: {count_both}")

# Show type values for "question_type"
if count_question_type > 0:
    print("\nTypes in 'question_type' field:")
    for doc in col.aggregate([{"$group": {"_id": "$question_type", "count": {"$sum": 1}}}]):
        print(f"  {doc['_id']}: {doc['count']}")

# Show type values for "type"
if count_type > 0:
    print("\nTypes in 'type' field:")
    for doc in col.aggregate([{"$group": {"_id": "$type", "count": {"$sum": 1}}}]):
        print(f"  {doc['_id']}: {doc['count']}")
