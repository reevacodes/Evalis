from dotenv import load_dotenv
import os
from pymongo import MongoClient

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]

submission = db.exam_submissions.find().sort("_id", -1).limit(1)
sub = list(submission)[0] if submission else None

if sub:
    print(f"Keys: {list(sub.keys())}")
    print(f"Total Score: {sub.get('total_score')}")
    print(f"MCQ Score: {sub.get('mcq_score')}")
    print(f"Coding Score: {sub.get('coding_score')}")
else:
    print("No submissions found.")
