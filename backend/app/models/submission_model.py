from app.database import submission_collection, submission_history_collection
from datetime import datetime


def save_submission(user_id, question_id, data):

    # =========================
    # ✅ 1. SAVE LATEST
    # =========================
    submission_collection.update_one(
        {"user_id": user_id, "question_id": question_id},
        {
            "$set": {
                "user_id": user_id,
                "question_id": question_id,
                **data
            }
        },
        upsert=True
    )

    # =========================
    # ✅ 2. SAVE HISTORY
    # =========================
    submission_history_collection.insert_one({
        "user_id": user_id,
        "question_id": question_id,
        **data,
        "submitted_at": datetime.utcnow()
    })