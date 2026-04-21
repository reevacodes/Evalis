import sys
import os
# Allow treating the script dir's parent (backend) as the root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from pymongo import MongoClient
    from app.config import MONGO_URI, DB_NAME
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    papers_coll = db["past_papers"]
    
    docs = list(papers_coll.find({}))
    print(f"Total past papers found globally: {len(docs)}")
    for d in docs:
        print(f"  ID: {d['_id']} | Semester: {d.get('semester')} | Year: {d.get('year')} | Subject: {d.get('subject_code')}")

    # FORCE FIX
    res = papers_coll.update_many({"year": 2020}, {"$set": {"subject_code": "COM-101"}})
    print(f"Updated {res.modified_count} records to COM-101.")

except Exception as e:
    print(f"Error: {e}")
