import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
past_papers = db["past_papers"]

# Find the mock test
mock = past_papers.find_one({"exam_type": "Practice"})
if not mock:
    print("No practice test found!")
else:
    print("Found Practice Test:", mock["_id"])
    try:
        paper = past_papers.find_one({"_id": mock["_id"]})
        paper["_id"] = str(paper["_id"])
        
        if "sets" in paper and paper["sets"]:
            paper["sections"] = paper["sets"].get("A", [])
            paper.pop("sets", None)
            
        print("Success! Sections length:", len(paper.get("sections", [])))
        for k, v in paper.items():
            print(f"{k}: {type(v)}")
    except Exception as e:
        print("Error:", e)
