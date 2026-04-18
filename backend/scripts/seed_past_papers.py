from pymongo import MongoClient
import os
import sys

# Append parent dir to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config import MONGO_URI, DB_NAME

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
past_papers_collection = db["past_papers"]
question_collection = db["questions"]

def seed():
    # Force drop existing mock test papers to inject new hierarchical structure
    past_papers_collection.delete_many({})
    print("Flushed legacy past_papers.")

    # Grab 3 random MCQ questions to act as seed data
    questions = list(question_collection.find({"question_type": "mcq"}).limit(3))
    
    formatted_questions = []
    for q in questions:
        formatted_questions.append({
            "id": str(q["_id"]),
            "question": q.get("question", "Sample Question?"),
            "options": q.get("options", ["A", "B", "C", "D"]),
            "correct_answer": q.get("correct_answer", "A"),
            "type": "mcq",
            "topic": q.get("topic", "General")
        })
        
    papers = [
        # SEMESTER 3 - CS-101 (Data Structures)
        {
            "exam_name": "Data Structures [MST]",
            "subject_code": "CS-101 (Data Structures)",
            "semester": 3,
            "year": 2022,
            "exam_type": "MST",
            "pattern": "MCQ",
            "duration_minutes": 60,
            "sections": [
                {"type": "mcq", "count": len(formatted_questions), "marks_per_question": 1, "questions": formatted_questions}
            ]
        },
        {
            "exam_name": "Data Structures [FINAL]",
            "subject_code": "CS-101 (Data Structures)",
            "semester": 3,
            "year": 2021,
            "exam_type": "Final",
            "pattern": "MCQ",
            "duration_minutes": 120,
            "sections": [
                {"type": "mcq", "count": len(formatted_questions), "marks_per_question": 1, "questions": formatted_questions}
            ]
        },
        # SEMESTER 3 - CS-201 (Algorithms)
        {
            "exam_name": "Algorithms Core [FINAL]",
            "subject_code": "CS-201 (Algorithms)",
            "semester": 3,
            "year": 2021,
            "exam_type": "Final",
            "pattern": "MCQ",
            "duration_minutes": 90,
            "sections": [
                {"type": "mcq", "count": len(formatted_questions), "marks_per_question": 1, "questions": formatted_questions}
            ]
        },
        # SEMESTER 4 - CS-301 (Computer Networks)
        {
            "exam_name": "Computer Networks [MST]",
            "subject_code": "CS-301 (Computer Networks)",
            "semester": 4,
            "year": 2023,
            "exam_type": "MST",
            "pattern": "MIXED",
            "duration_minutes": 60,
            "sections": [
                {"type": "mcq", "count": len(formatted_questions), "marks_per_question": 1, "questions": formatted_questions}
            ]
        }
    ]

    past_papers_collection.insert_many(papers)
    print("Successfully Seeded Hierarchical Past Papers.")

if __name__ == "__main__":
    seed()
