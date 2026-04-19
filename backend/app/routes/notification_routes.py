from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId

from app.database import notification_collection
from app.utils.auth_dependency import require_role

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/me")
def get_my_notifications(user = Depends(require_role("student"))):
    """Fetch all notifications for the logged-in student, sorted newest first"""
    docs = notification_collection.find({"user_id": user.get("sub")}).sort("created_at", -1)
    
    notifications = []
    for doc in docs:
        doc["_id"] = str(doc["_id"])
        notifications.append(doc)
        
    return {"notifications": notifications}

@router.put("/{notification_id}/read")
def mark_notification_read(notification_id: str, user = Depends(require_role("student"))):
    """Mark a specific notification as read"""
    try:
        obj_id = ObjectId(notification_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Notification ID")
        
    result = notification_collection.update_one(
        {"_id": obj_id, "user_id": user.get("sub")},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    return {"message": "Notification marked as read"}

@router.put("/read-all")
def mark_all_read(user = Depends(require_role("student"))):
    """Mark all notifications as read for the user"""
    notification_collection.update_many(
        {"user_id": user.get("sub"), "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All marked as read"}
