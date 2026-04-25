import os
import time
import json
import uuid
import re
from pymongo import MongoClient
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# 1. SETUP MONGODB
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
mock_collection = db["mock_question_collection"]
curriculum_collection = db["curriculum"]

# 2. SETUP GEMINI API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("❌ ERROR: GEMINI_API_KEY is not set in .env")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)

# Use Gemini 2.5 Flash Lite for high rate limits and speed
model = genai.GenerativeModel('gemini-2.5-flash-lite', generation_config={"response_mime_type": "application/json"})

def generate_questions(subject_name, subject_code, unit_number, topics_list, missing_mcq, missing_coding):
    prompt = f"""
    You are an expert Computer Science professor. Generate practice questions for a university exam.
    Subject: {subject_name} ({subject_code})
    Chapter/Unit Number: {unit_number}
    Topics in this chapter: {', '.join([t['name'] for t in topics_list])}

    I need EXACTLY {missing_mcq} Multiple Choice Questions (MCQs) and EXACTLY {missing_coding} Coding questions.
    
    Output ONLY valid JSON matching this schema:
    {{
      "questions": [
        {{
          "type": "mcq",
          "question_text": "string",
          "options": ["string", "string", "string", "string"],
          "correct_answer": "string (must exactly match one of the options)",
          "topic": "string (pick the most relevant topic from the list)",
          "marks": 1,
          "difficulty": "easy|medium|hard"
        }},
        {{
          "type": "coding",
          "question_text": "string (clear problem statement)",
          "topic": "string",
          "marks": 10,
          "difficulty": "medium|hard",
          "language": "c",
          "input_format": "string",
          "output_format": "string",
          "constraints": "string",
          "time_limit": 2.0,
          "memory_limit": 256,
          "sample_input": "string",
          "sample_output": "string",
          "hidden_input": "string",
          "hidden_output": "string",
          "starter_code": "string (C code template)"
        }}
      ]
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text
        # Sometimes model wraps json in ```json ... ```
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
            
        data = json.loads(text.strip())
        return data.get("questions", [])
    except Exception as e:
        print(f"❌ Failed to generate or parse JSON: {e}")
        return []

def run_ai_seeder():
    print("🚀 Starting AI Mock Question Generator...")
    
    # Fetch all curriculums
    all_curriculums = list(curriculum_collection.find({}))
    if not all_curriculums:
        print("❌ No curriculum found in database. Please upload questions or generate curriculum first.")
        return
        
    for curriculum in all_curriculums:
        semester = curriculum.get("semester")
        if semester != 1:
            continue
        subjects = curriculum.get("subjects", [])
        
        for subject in subjects:
            sub_name = subject.get("name")
            sub_code = subject.get("code")
            units = subject.get("units", [])
            
            for unit in units:
                unit_number = str(unit.get("unit_number"))
                topics = unit.get("topics", [])
                
                # Check cache (how many questions already exist?)
                existing_mcq = mock_collection.count_documents({
                    "subject_code": sub_code,
                    "unit": unit_number,
                    "type": "mcq"
                })
                
                existing_coding = mock_collection.count_documents({
                    "subject_code": sub_code,
                    "unit": unit_number,
                    "type": "coding"
                })
                
                target_mcq = 60
                target_coding = 4
                
                missing_mcq = max(0, target_mcq - existing_mcq)
                missing_coding = max(0, target_coding - existing_coding)
                
                if missing_mcq == 0 and missing_coding == 0:
                    print(f"✅ SKIPPED: {sub_code} Chapter {unit_number} (Already cached)")
                    continue
                    
                print(f"⏳ GENERATING: {sub_code} Chapter {unit_number} (Missing {missing_mcq} MCQ, {missing_coding} Coding)...")
                
                questions = generate_questions(sub_name, sub_code, unit_number, topics, missing_mcq, missing_coding)
                
                if not questions:
                    print(f"⚠️ Warning: Rate limit hit or no questions returned for {sub_code} Chapter {unit_number}")
                    print("💤 Sleeping for 65 seconds to fully reset Google's 1-minute rolling quota...")
                    time.sleep(65)
                    continue
                
                # Format and insert
                docs_to_insert = []
                for q in questions:
                    q["_id"] = str(uuid.uuid4())
                    q["subject_code"] = sub_code
                    q["subject_name"] = sub_name
                    q["semester"] = semester
                    q["unit"] = unit_number
                    docs_to_insert.append(q)
                
                if docs_to_insert:
                    mock_collection.insert_many(docs_to_insert)
                    print(f"🎉 INSERTED: {len(docs_to_insert)} questions for {sub_code} Chapter {unit_number}")
                
                # RATE LIMITING: Sleep to respect 15 Requests Per Minute (RPM) free tier
                print("💤 Sleeping for 6.5 seconds to respect rate limits...")
                time.sleep(6.5)

    print("✅ AI Mock Generation Complete!")

if __name__ == "__main__":
    run_ai_seeder()
