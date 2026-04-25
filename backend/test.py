from pymongo import MongoClient
from bson import ObjectId

client = MongoClient('mongodb://localhost:27017/')
db = client['evalis']
past_papers = db['past_papers']

# Find the latest generated mock test
mock = past_papers.find_one({"exam_type": "Practice"})
if not mock:
    print("No mock test found!")
else:
    print("Found Mock Test ID:", mock["_id"])
    
    # Try to simulate the route
    try:
        paper = past_papers.find_one({"_id": mock["_id"]})
        paper["_id"] = str(paper["_id"])
        
        if "sets" in paper and paper["sets"]:
            paper["sections"] = paper["sets"].get("A", [])
            paper.pop("sets", None)
            
        print("Success! Sections length:", len(paper.get("sections", [])))
        
        # Are there any other ObjectIds inside sections?
        for section in paper.get("sections", []):
            for q in section.get("questions", []):
                for k, v in q.items():
                    if isinstance(v, ObjectId):
                        print(f"WARNING: ObjectId found in question: {k} -> {v}")
    except Exception as e:
        print("Error:", e)
