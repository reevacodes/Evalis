import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db

def fix():
    user = db.users.find_one({"email": "arpitthakur88888@gmail.com"})
    if user and user.get("college_email") == "2022a1r159@gmail.com":
        db.users.update_one(
            {"email": "arpitthakur88888@gmail.com"},
            {"$set": {"college_email": "2022a1r159@mietjammu.in"}}
        )
        print("Fixed Arpit's college email.")
    else:
        print("No fix needed or user not found.")

if __name__ == "__main__":
    fix()
