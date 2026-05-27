def question_helper(question) -> dict:
    return {
        "id": str(question["_id"]),
        "semester": question.get("semester"),

        "subject_code": question.get("subject_code"),
        "subject_name": question.get("subject_name"),

        "unit": question.get("unit"),
        "topic": question.get("topic"),

        "question_text": question.get("question_text") or question.get("question_text"),
        "question_type": question.get("question_type") or question.get("type"),

        "options": question.get("options"),
        "correct_answer": question.get("correct_answer"),

        "difficulty": question.get("difficulty"),
        "marks": question.get("marks"),

        "tags": question.get("tags", []),
        "created_at": question.get("created_at"),

        # 🔥 ADD THESE (CRITICAL)
        "input_format": question.get("input_format"),
        "output_format": question.get("output_format"),
        "constraints": question.get("constraints"),

        "starter_code": question.get("starter_code"),
        "language": question.get("language"),

        "test_cases": question.get("test_cases", []),
    }