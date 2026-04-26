import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db

def test():
    users = db.users.find({}, {"email": 1, "college_email": 1, "name": 1, "_id": 0})
    for u in users:
        print(u)

if __name__ == "__main__":
    test()
