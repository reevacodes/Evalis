import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(dotenv_path)

mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME", "evalis_db")
print("MONGO_URI:", mongo_uri)
print("DB_NAME:", db_name)

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    client.server_info()
    print("SUCCESS: MongoDB Connected successfully!")
except Exception as e:
    print("ERROR: Failed to connect to MongoDB:", e)
    sys.exit(1)

# Let's inspect the exams collection
exams = list(db["exams"].find({}))
print(f"Found {len(exams)} exams:")
for e in exams:
    print(f"Exam ID: {e['_id']} | Title: {e.get('exam_name') or e.get('title')} | Published: {e.get('is_results_published')}")
    sections = e.get("sections", [])
    print("Sections:")
    for s in sections:
        q_types = [q.get("type", "unknown") for q in s.get("questions", [])]
        print(f"  - Section: {s.get('name') or s.get('title')} | Question Types: {q_types}")
        for q in s.get("questions", []):
            if q.get("type") == "coding":
                print(f"    * Coding Q: {q.get('question_text') or q.get('question')} | ID: {q.get('id') or q.get('_id')}")

# Inspect exam submissions
submissions = list(db["exam_submissions"].find({}))
print(f"Found {len(submissions)} exam submissions:")
for sub in submissions:
    print(f"Sub ID: {sub['_id']} | Exam ID: {sub.get('exam_id')} | Student: {sub.get('student_name') or sub.get('student_id')}")
    print(f"  MCQ Score: {sub.get('mcq_score')} | Coding Score: {sub.get('coding_score')} | Total: {sub.get('total_score')}")
    print(f"  Coding Answers keys: {list(sub.get('coding_answers', {}).keys())}")
    print(f"  Coding Review keys: {list(sub.get('coding_review_data', {}).keys())}")
    for qid, review in sub.get('coding_review_data', {}).items():
        print(f"    - Review QID {qid}: status={review.get('status')}, score={review.get('score')}/{review.get('max_score')}")
