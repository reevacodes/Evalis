from dotenv import load_dotenv
import os
from pymongo import MongoClient
from bson import ObjectId

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]

submission = db.exam_submissions.find().sort("_id", -1).limit(1)
sub = list(submission)[0] if submission else None

if sub:
    print(f"Exam ID: {sub['exam_id']}")
    exam = db.exams.find_one({"_id": ObjectId(sub["exam_id"])})
    print(f"Exam total_marks: {exam.get('total_marks')}")
    print(f"Sub total_score: {sub.get('total_score')}")
    print(f"Sub mcq_score: {sub.get('mcq_score')}")
else:
    print("No submissions found.")
