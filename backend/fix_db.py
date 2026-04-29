from app.database import mock_question_collection
res = mock_question_collection.update_many({"type": {"$exists": False}}, {"$set": {"type": "coding", "marks": 10}})
print(f"Fixed {res.modified_count} questions!")
