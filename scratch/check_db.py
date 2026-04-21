from pymongo import MongoClient

def run():
    client = MongoClient("mongodb://localhost:27017/")
    db = client.evalis
    docs = list(db.past_papers.find({"year": 2020}))
    
    with open("db_output.txt", "w") as f:
        for doc in docs:
            f.write(f"{doc['_id']} | {doc['exam_name']} | {doc['subject_code']}\n")
    print("Exported to db_output.txt")

if __name__ == '__main__':
    run()
