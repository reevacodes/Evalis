from pymongo import MongoClient

def check():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["evalis"] # might be "evalis_db" or similar. Let's try evalis
    # try to guess db name from app.config if we can
    for db_name in client.list_database_names():
        if "eval" in db_name.lower():
            db = client[db_name]
            print(f"Found DB: {db_name}")
            break
            
    papers = list(db.past_papers.find({}, {"year": 1, "subject_code": 1}))
    print("Papers in DB:")
    for p in papers:
        print(f"  Year: {p.get('year')} | Subject: {p.get('subject_code')}")

if __name__ == "__main__":
    check()
