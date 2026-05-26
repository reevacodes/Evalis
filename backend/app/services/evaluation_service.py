from bson import ObjectId
from app.database import exam_submission_collection, exam_collection, question_collection, practice_attempts_collection, past_papers_collection
from app.services.submission_service import evaluate_code
import os
import json
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    ai_model = genai.GenerativeModel('gemini-2.5-flash-lite', generation_config={"response_mime_type": "application/json"})
else:
    ai_model = None

def async_generate_ai_study_plan(submission_id: str):
    """
    Background worker that analyzes a student's incorrect MCQ answers
    and generates a personalized 3-bullet-point study plan using Gemini.
    """
    if not ai_model:
        print("⚠️ AI TUTOR: Gemini API Key not set. Skipping AI feedback generation.")
        return
        
    try:
        submission = exam_submission_collection.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            return

        exam_id = submission.get("exam_id")
        exam = exam_collection.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            return
            
        mcq_answers = submission.get("mcq_answers", {})
        wrong_questions = []
        
        sets = exam.get("sets", {})
        assigned_set = submission.get("assigned_set")
        assigned_sections = sets.get(assigned_set, [])
        if not assigned_sections:
            assigned_sections = exam.get("sections", [])
            
        mcq_section = next((s for s in assigned_sections if s["type"] == "mcq"), None)
        if not mcq_section:
            return
            
        for q in mcq_section.get("questions", []):
            q_id = str(q.get("id") or q.get("_id"))
            student_answer = mcq_answers.get(q_id)
            correct = q.get("correct_answer")
            
            if student_answer and correct and student_answer.strip().lower() != correct.strip().lower():
                wrong_questions.append({
                    "question": q.get("question") or q.get("question_text"),
                    "student_answer": student_answer,
                    "correct_answer": correct,
                    "topic": q.get("topic", "General")
                })
        
        if not wrong_questions:
            exam_submission_collection.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": {"ai_study_plan": ["Excellent work! You answered all MCQs correctly.", "Keep reviewing advanced topics.", "Try teaching these concepts to peers to solidify your knowledge."]}}
            )
            return
            
        # Limit to 10 wrong questions to avoid massive prompt token usage
        prompt = f"""
        You are an expert AI tutor. Analyze these incorrect answers from a student's exam (showing max 10 errors).
        Incorrect Answers:
        {json.dumps(wrong_questions[:10])}
        
        Identify why they likely got these wrong (e.g. confusing pass-by-value vs pass-by-reference) and provide a concise, 3-bullet-point personalized study plan.
        Return ONLY a JSON object with a single key "study_plan" containing a list of exactly 3 string bullet points.
        """
        
        response = ai_model.generate_content(prompt)
        result = json.loads(response.text)
        study_plan = result.get("study_plan", ["Review the topics you got wrong.", "Practice more mock exams.", "Consult your instructor for help."])
        
        exam_submission_collection.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {"ai_study_plan": study_plan}}
        )
        print(f"✅ AI TUTOR: Generated personalized study plan for submission {submission_id}")
        
    except Exception as e:
        print(f"🔥 AI TUTOR BACKGROUND WORKER EXCEPTION on {submission_id}:", str(e))

def async_evaluate_submission(submission_id: str):
    """
    Background worker that extracts purely un-evaluated coding answers 
    and iterates them independently against the Docker Sandbox!
    """
    try:
        submission = exam_submission_collection.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            print("🔥 BACKGROUND WORKER ERROR: Submission missing")
            return

        coding_answers = submission.get("coding_answers", {})
        if not coding_answers:
            print("✅ BACKGROUND WORKER: No code payloads to process. Wiping manual review flags natively.")
            exam_submission_collection.update_one(
                {"_id": ObjectId(submission_id)},
                {"$set": {"pending_manual_review": False}}
            )
            return

        # 1. Dynamically aggregate Max Target Math 
        exam = exam_collection.find_one({"_id": ObjectId(submission.get("exam_id"))})
        if not exam:
            return

        # Each coding question is explicitly worth 10 marks
        marks_per_coding_question = 10.0

        # 2. Iterate against Sandbox execution
        coding_score_earned = 0
        execution_metadata = {}

        for qid, payload in coding_answers.items():
            code = payload.get("code", "")
            language = payload.get("language", "python")

            if not code.strip():
                execution_metadata[qid] = {
                    "status": "No Code",
                    "passed": 0,
                    "score": 0
                }
                continue

            question = question_collection.find_one({"_id": ObjectId(qid)})
            if not question:
                continue

            test_cases = question.get("test_cases")
            if not test_cases:
                test_cases = (question.get("sample_test_cases") or []) + (question.get("hidden_test_cases") or [])
            if not test_cases:
                continue

            # Heavy blocking Call (Invokes Native Docker Engine)
            hidden_result = evaluate_code(code, test_cases, language)

            status = hidden_result.get("status", "RE")
            passed_cases = hidden_result.get("passed", 0)
            total_cases = hidden_result.get("total", 0)
            
            # Each test case gives proportional marks (e.g., 5 test cases -> 2 marks each if total is 10)
            if total_cases > 0:
                points = round((passed_cases / total_cases) * marks_per_coding_question, 2)
            else:
                points = 0
                
            coding_score_earned += points

            execution_metadata[qid] = {
                "status": status,
                "passed": passed_cases,
                "total_cases": total_cases,
                "score": points,
                "max_score": round(marks_per_coding_question, 2),
                "details": hidden_result.get("details", [])
            }

        # 3. Securely overwrite DB Ledger
        final_total_score = submission.get("mcq_score", 0) + coding_score_earned

        exam_submission_collection.update_one(
            {"_id": ObjectId(submission_id)},
            {
                "$set": {
                    "coding_score": coding_score_earned,
                    "total_score": round(final_total_score, 2),
                    "pending_manual_review": False,
                    "coding_review_data": execution_metadata 
                }
            }
        )

        print(f"✅ BACKGROUND WORKER: Evaluation COMPLETE. Submission ID {submission_id} scored: {final_total_score}")

    except Exception as e:
        print(f"🔥 BACKGROUND WORKER EXCEPTION on {submission_id}:", str(e))

def async_evaluate_practice_submission(practice_id: str):
    """
    Background worker for MOCK TESTS specifically.
    Evaluates coding answers and runs Gemini AI Code Review (Senior Dev Feedback).
    """
    try:
        attempt = practice_attempts_collection.find_one({"_id": ObjectId(practice_id)})
        if not attempt:
            return

        coding_answers = attempt.get("coding_answers", {})
        if not coding_answers:
            return

        # Fetch the paper
        paper = past_papers_collection.find_one({"_id": ObjectId(attempt.get("paper_id"))})

        # Iterate against Sandbox execution
        execution_metadata = {}

        for qid, payload in coding_answers.items():
            code = payload.get("code", "")
            language = payload.get("language", "python")

            if not code.strip():
                execution_metadata[qid] = {
                    "status": "No Code",
                    "passed": 0,
                    "score": 0
                }
                continue

            # Need to find the mock question
            question = None
            if paper:
                for section in paper.get("sections", []) + paper.get("sets", {}).get("A", []):
                    if section.get("type") == "coding":
                        for q in section.get("questions", []):
                            if str(q.get("id", q.get("_id"))) == qid:
                                question = q
                                break
                    if question:
                        break

            if not question:
                continue

            test_cases = question.get("test_cases")
            if not test_cases:
                test_cases = (question.get("sample_test_cases") or []) + (question.get("hidden_test_cases") or [])
            if not test_cases:
                continue

            # Heavy blocking Call (Invokes Native Docker Engine)
            hidden_result = evaluate_code(code, test_cases, language)

            status = hidden_result.get("status", "RE")
            passed_cases = hidden_result.get("passed", 0)
            total_cases = hidden_result.get("total", 0)
            
            # Marks are not strictly enforced in practice coding, but let's calculate based on 10
            marks_per_coding_question = 10.0
            if total_cases > 0:
                points = round((passed_cases / total_cases) * marks_per_coding_question, 2)
            else:
                points = 0

            # 🤖 AI CODE REVIEW (Senior Dev Feedback) exclusively for mocks
            ai_feedback = None
            if ai_model and code.strip():
                try:
                    q_text = question.get("question", question.get("question_text", "A coding problem"))
                    prompt = f"""
                    You are a Senior Software Engineer reviewing a junior developer's code.
                    The problem they are solving is:
                    {q_text}
                    
                    Their code in {language}:
                    ```
                    {code}
                    ```
                    
                    The code passed {passed_cases} out of {total_cases} test cases.
                    
                    Analyze their code for Time Complexity (Big O), Memory Efficiency, and Readability.
                    Return a JSON object with the following keys:
                    - "time_complexity": Time complexity of the submitted code, e.g., "O(N)" or "O(N^2)"
                    - "memory_efficiency": Space complexity of the submitted code, e.g., "O(1)" or "O(N)"
                    - "readability": Readability rating, e.g., "Good", "Needs Improvement", "Excellent"
                    - "feedback": a short, constructive paragraph (max 3 sentences) of review feedback. If they got 100%, praise them but suggest how they could optimize it if possible (e.g., using a Hash Map for O(n) instead of an O(n^2) nested loop).
                    """
                    resp = ai_model.generate_content(prompt)
                    ai_feedback = resp.text.strip()
                except Exception as ex:
                    print(f"Failed to generate AI code review for practice {qid}: {ex}")

            execution_metadata[qid] = {
                "status": status,
                "passed": passed_cases,
                "total_cases": total_cases,
                "score": points,
                "max_score": round(marks_per_coding_question, 2),
                "details": hidden_result.get("details", []),
                "ai_feedback": ai_feedback
            }

        # Aggregate scoring information
        total_coding_score = sum(c.get("score", 0) for c in execution_metadata.values())
        mcq_score = attempt.get("score", 0)
        final_score = round(mcq_score + total_coding_score, 2)

        # Calculate max possible score to compute combined accuracy
        max_possible_score = 0
        if paper:
            sections = paper.get("sections", [])
            if not sections and "sets" in paper:
                sections = paper.get("sets", {}).get("A", [])
            for section in sections:
                if section.get("type") == "mcq":
                    total_mcqs = len(section.get("questions", []))
                    marks_per_mcq = section.get("marks_per_question", 1)
                    max_possible_score += total_mcqs * marks_per_mcq
                elif section.get("type") == "coding":
                    total_coding_questions = len(section.get("questions", []))
                    max_possible_score += total_coding_questions * 10.0

        analytics = attempt.get("analytics", {})
        if max_possible_score > 0:
            analytics["accuracy"] = round((final_score / max_possible_score) * 100, 2)
        else:
            analytics["accuracy"] = 0.0

        practice_attempts_collection.update_one(
            {"_id": ObjectId(practice_id)},
            {
                "$set": {
                    "coding_results": execution_metadata,
                    "coding_score": total_coding_score,
                    "score": final_score,
                    "analytics": analytics
                }
            }
        )
        print(f"✅ AI TUTOR: Generated mock exam coding review for attempt {practice_id}. Score: {final_score}, Accuracy: {analytics['accuracy']}%")

    except Exception as e:
        print(f"🔥 BACKGROUND WORKER EXCEPTION on practice attempt {practice_id}:", str(e))
