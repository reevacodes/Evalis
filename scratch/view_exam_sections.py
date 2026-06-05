import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(r"c:\Projects\Evalis\backend")
load_dotenv(r"c:\Projects\Evalis\backend\.env")

mongo_uri = os.getenv("MONGO_URI")
db_name = os.getenv("DB_NAME", "evalis_db")

output_file = r"c:\Projects\Evalis\scratch\sections_output.txt"

with open(output_file, "w", encoding="utf-8") as f:
    f.write(f"Connecting to MONGO_URI: {mongo_uri} with DB: {db_name}\n")
    f.flush()
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        client.server_info()
        f.write("CONNECTED successfully!\n")
        f.flush()
    except Exception as e:
        f.write(f"FAILED to connect: {e}\n")
        f.flush()
        sys.exit(1)

    exams = list(db["exams"].find({}))
    f.write(f"Exams found: {len(exams)}\n")
    f.flush()
    for e in exams:
        f.write(f"\nExam: {e.get('exam_name')} | ID: {e['_id']}\n")
        sections = e.get("sections", [])
        for sIdx, s in enumerate(sections):
            f.write(f"  Section {sIdx+1}: {s.get('name') or s.get('title')}\n")
            questions = s.get("questions", [])
            f.write(f"    Total questions in section: {len(questions)}\n")
            for qIdx, q in enumerate(questions):
                f.write(f"      Q{qIdx+1}: text='{q.get('question_text') or q.get('question')}' | type='{q.get('type')}' | category='{q.get('category')}' | id='{q.get('id') or q.get('_id')}' | has_options={ 'options' in q }\n")
                f.flush()

    # Also print submissions
    subs = list(db["exam_submissions"].find({}))
    f.write(f"\nSubmissions found: {len(subs)}\n")
    f.flush()
    for sub in subs:
        f.write(f"\nSubmission ID: {sub['_id']} | Exam ID: {sub.get('exam_id')}\n")
        f.write(f"  MCQ Answers: {sub.get('mcq_score')} | {sub.get('mcq_answers')}\n")
        f.write(f"  Coding Answers keys: {list(sub.get('coding_answers', {}).keys())}\n")
        f.write(f"  Coding Review keys: {list(sub.get('coding_review_data', {}).keys())}\n")
        f.flush()
        for qid, review in sub.get('coding_review_data', {}).items():
            f.write(f"    - Review QID {qid}: status={review.get('status')}, score={review.get('score')}/{review.get('max_score')}\n")
            f.flush()

print("SUCCESS: Done")
