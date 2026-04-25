import os
from datetime import datetime
from pymongo import MongoClient
import uuid

from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]
mock_collection = db["mock_question_collection"]

# Clear existing mocks to avoid duplicates
mock_collection.delete_many({})

topics = ["Ch 3: Arrays & Strings", "Ch 4: Functions & Recursion", "Ch 5: Pointers & Memory"]

# Add some MCQs
mcqs = []
for i in range(1, 31):
    topic_idx = (i - 1) % 3
    mcqs.append({
        "question_text": f"Mock Practice MCQ {i} on {topics[topic_idx]}",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A",
        "topic": topics[topic_idx],
        "unit": "Unit 2",
        "subject_name": "Data Structures using C",
        "subject_code": "COM-102",
        "semester": 2,
        "marks": 1,
        "difficulty": "medium",
        "type": "mcq",
        "tags": ["cs", "practice"],
        "created_at": datetime.utcnow()
    })

# Add some Coding Questions
coding = []
coding_prompts = [
    ("Reverse an Array", "Write a C program to reverse an array of N integers in place.", 0),
    ("Recursive Fibonacci", "Write a recursive C function to compute the Nth Fibonacci number.", 1),
    ("Pointer Swap", "Write a C function that swaps the values of two variables using pointers.", 2),
    ("Find Max Element", "Write a C function to find the maximum element in an array using pointers.", 2),
    ("String Palindrome", "Check if a given string is a palindrome without using library functions.", 0)
]

for i, (title, prompt, topic_idx) in enumerate(coding_prompts):
    coding.append({
        "question_text": prompt,
        "topic": topics[topic_idx],
        "unit": "Unit 2",
        "subject_name": "Data Structures using C",
        "subject_code": "COM-102",
        "semester": 2,
        "marks": 5,
        "difficulty": "hard" if topic_idx == 2 else "medium",
        "type": "coding",
        "tags": ["cs", "coding", "practice"],
        "language": "c",
        "input_format": "Standard input",
        "output_format": "Standard output",
        "time_limit": 2.0,
        "memory_limit": 256,
        "sample_input": "Sample",
        "sample_output": "Sample Out",
        "test_cases": [
            {"input": "1", "output": "1", "hidden": False},
            {"input": "5", "output": "5", "hidden": True}
        ],
        "created_at": datetime.utcnow()
    })

if mcqs:
    mock_collection.insert_many(mcqs)
if coding:
    mock_collection.insert_many(coding)

print(f"Seeded {len(mcqs)} MCQs and {len(coding)} Coding questions into mock_question_collection.")
