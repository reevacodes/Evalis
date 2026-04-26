import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db
from app.models.user_model import get_user_by_email

def test():
    user = get_user_by_email(db, "1@miet.ac.in") # Or whatever college email
    print("Found user:", user)

if __name__ == "__main__":
    test()
