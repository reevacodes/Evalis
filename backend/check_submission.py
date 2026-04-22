from dotenv import load_dotenv
import os
from pymongo import MongoClient

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]

submission = db.exam_submissions.find().sort("_id", -1).limit(1)
sub = list(submission)[0] if submission else None

if sub:
    print(f"Exam ID: {sub.get('exam_id')}")
    print(f"MCQ Score: {sub.get('mcq_score')}")
    print(f"MCQ Answers keys: {list(sub.get('mcq_answers', {}).keys())[:5]}")
    print(f"Coding Answers keys: {list(sub.get('coding_answers', {}).keys())[:5]}")
    
    # Check the exam itself
    exam = db.exams.find_one({"_id": sub["exam_id"]})
    print(f"Exam Name: {exam.get('exam_name')} | Exam Title: {exam.get('title')}")
    if exam and "sets" in exam and len(exam["sets"]) > 0:
        first_q = exam["sets"][0]["sections"][0]["questions"][0]
        print(f"First question keys: {list(first_q.keys())}")
else:
    print("No submissions found.")
