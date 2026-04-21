from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017/')
db = client['evalis']
res = db.past_papers.delete_many({'year': 2020})
print(f'Deleted {res.deleted_count} exam(s) from the database successfully!')
