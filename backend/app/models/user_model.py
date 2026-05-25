from datetime import datetime
from bson import ObjectId 

def create_user(db, email: str, hashed_password: str, role: str, name: str, semester: int = None, college_email: str = None, college_name: str = None, student_id: str = None, roll_no: str = None, department: str = None):
    """
    Create a new user in the database.
    """
    user = {
        "email": email,
        "password": hashed_password,
        "name": name,
        "role": role,
        "semester": semester,
        "college_email": college_email,
        "college_name": college_name,
        "student_id": student_id,
        "roll_no": roll_no,
        "department": department,
        "created_at": datetime.utcnow()
    }
    return db.users.insert_one(user)


def get_user_by_email(db, email: str):
    """
    Fetch user by email or college_email.
    """
    return db.users.find_one({
        "$or": [
            {"email": email},
            {"college_email": email}
        ]
    })


def get_user_by_id(db, user_id):
    """
    Fetch user by ID.
    """
    return db.users.find_one({"_id": ObjectId(user_id)})


def get_all_users(db):
    """
    Fetch all users (Admin use).
    """
    return list(db.users.find({}, {"password": 0}))  # exclude password


def delete_user(db, email: str):
    """
    Delete a user by email (Admin only).
    """
    return db.users.delete_one({"email": email})


def update_user_role(db, email: str, new_role: str):
    """
    Update user role (Admin only).
    """
    return db.users.update_one(
        {"email": email},
        {"$set": {"role": new_role}}
    )


def update_user_password(db, email: str, hashed_password: str):
    """
    Update user password.
    """
    return db.users.update_one(
        {
            "$or": [
                {"email": email},
                {"college_email": email}
            ]
        },
        {"$set": {"password": hashed_password}}
    )

def update_user_profile(db, email: str, data: dict):
    """
    Update general user profile (name, profile_picture).
    """
    return db.users.update_one(
        {"email": email},
        {"$set": data}
    )