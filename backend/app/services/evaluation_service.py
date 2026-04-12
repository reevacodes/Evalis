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

        total_exam_marks = exam.get("total_marks", 100)
        total_mcq_count = len(submission.get("mcq_answers", {}))
        # Since MCQs are hard-locked to 1 PT per rule, the raw remainder represents max coding weight.
        total_coding_max = max(total_exam_marks - total_mcq_count, 0)

        question_count = len(coding_answers)
        marks_per_coding_question = total_coding_max / question_count if question_count > 0 else 0

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
            sandbox_score_percentage = hidden_result.get("score", 0)  # usually 0-100%
            
            # Map physical integer points 
            points = round((sandbox_score_percentage / 100) * marks_per_coding_question, 2)
            coding_score_earned += points

            execution_metadata[qid] = {
                "status": status,
                "passed": hidden_result.get("passed", 0),
                "total_cases": hidden_result.get("total", 0),
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
