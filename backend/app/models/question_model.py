def question_helper(question) -> dict:
    return {
        "id": str(question["_id"]),
        "semester": question["semester"],

        "subject_code": question.get("subject_code"),
        "subject_name": question.get("subject_name"),

        "unit": question["unit"],
        "topic": question["topic"],

        "question_text": question["question_text"],
        "question_type": question["question_type"],

        "options": question.get("options"),
        "correct_answer": question.get("correct_answer"),

        "difficulty": question["difficulty"],
        "marks": question["marks"],

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