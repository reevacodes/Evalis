import os
import sys
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(r"c:\Projects\Evalis\backend")
load_dotenv(r"c:\Projects\Evalis\backend\.env")

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME", "evalis_db")]
col = db["mock_question_collection"]

# Find documents missing created_at
missing_count = col.count_documents({"created_at": {"$exists": False}})
none_count = col.count_documents({"created_at": None})

print(f"Missing 'created_at': {missing_count}")
print(f"Has 'created_at' as None: {none_count}")

default_dt = datetime(2026, 4, 24, 19, 21, 3)

# Update those missing created_at
res1 = col.update_many({"created_at": {"$exists": False}}, {"$set": {"created_at": default_dt}})
print(f"Fixed missing: {res1.modified_count} documents.")

# Update those with created_at as None
res2 = col.update_many({"created_at": None}, {"$set": {"created_at": default_dt}})
print(f"Fixed None values: {res2.modified_count} documents.")
