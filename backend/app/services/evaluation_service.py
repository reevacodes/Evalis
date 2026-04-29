from bson import ObjectId
from app.database import exam_submission_collection, exam_collection, question_collection
from app.services.submission_service import evaluate_code

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

            test_cases = question.get("test_cases", [])
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
