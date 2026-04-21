import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from app.database import past_papers_collection
    
    # 1. Print all current 2020 papers
    print("BEFORE DELETION:")
    before = list(past_papers_collection.find({"year": 2020}))
    for item in before:
        print(item["_id"], item["exam_name"])
        
    res = past_papers_collection.delete_many({"year": 2020})
    print(f"DELETED {res.deleted_count} items!")
    
except Exception as e:
    print(f"Error: {e}")
