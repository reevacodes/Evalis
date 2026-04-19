from pymongo import MongoClient
from app.config import MONGO_URI, DB_NAME
from app.utils.security import hash_password

# DB CONNECTION

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

print("Connected DB:", db.name)


# COLLECTIONS

question_collection = db["questions"]
exam_collection = db["exams"]
curriculum_collection = db["curriculum"]

user_collection = db["users"]
reschedule_collection = db["reschedule_requests"]

# Latest submissions (1 per user + question)
submission_collection = db["submissions"]

# Global Notifications (Cross-platform inbox)
notification_collection = db["notifications"]

# Exam Submissions (Entire student test papers & analytics)
exam_submission_collection = db["exam_submissions"]

# Full history (multiple entries)
submission_history_collection = db["submission_history"]

# 📚 PAST PAPERS & PRACTICE
past_papers_collection = db["past_papers"]
practice_attempts_collection = db["practice_attempts"]


# INDEXES

# Ensure only ONE latest submission per user + question
submission_collection.create_index(
    [("user_id", 1), ("question_id", 1)],
    unique=True
)

# Fast history queries
submission_history_collection.create_index(
    [("user_id", 1), ("question_id", 1)]
)

# Sort by latest
submission_history_collection.create_index(
    [("submitted_at", -1)]
)

user_collection.create_index("email", unique=True)

def get_db():
    return db

def seed_users():
    users = [
        {
            "email": "admin@test.com",
            "password": hash_password("123456"),
            "name": "Admin User",
            "role": "admin"
        },
        {
            "email": "teacher@test.com",
            "password": hash_password("123456"),
            "name": "Teacher User",
            "role": "teacher"
        },
        {
            "email": "student@test.com",
            "password": hash_password("123456"),
            "name": "Student User",
            "role": "student"
        }
    ]

    for user in users:
        existing = user_collection.find_one({"email": user["email"]})
        if not existing:
            user_collection.insert_one(user)
            print(f"Seeded {user['role']}: {user['email']}")
        else:
            print(f"Already exists: {user['email']}")

seed_users()

# admin@test.com / 123456
# teacher@test.com / 123456
# student@test.com / 123456
