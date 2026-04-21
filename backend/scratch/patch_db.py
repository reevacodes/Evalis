import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from app.database import past_papers_collection
    
    # 1. Update the record
    res = past_papers_collection.update_many(
        {"year": 2020}, 
        {"$set": {
            "subject_code": "COM-101 (Introduction to C Programming)", 
            "exam_name": "Introduction to C Programming [MST]"
        }}
    )
    print(f"UPDATED {res.modified_count} items!")
    
except Exception as e:
    print(f"Error: {e}")
