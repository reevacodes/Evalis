from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId

from pydantic import BaseModel
import requests

from app.database import notification_collection, user_collection
from app.utils.auth_dependency import require_role, get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def send_expo_push(user_id: str, title: str, message: str, data: dict = None):
    # Find user
    user = user_collection.find_one({"email": user_id})
    if not user or not user.get("push_token"):
        return False
        
    try:
        payload = {
            "to": user["push_token"],
            "title": title,
            "body": message,
            "data": data or {}
        }
        res = requests.post("https://exp.host/--/api/v2/push/send", json=payload, timeout=5)
        print("📡 Sent physical push notification to", user_id, "Status:", res.status_code)
        return True
    except Exception as e:
        print("⚠️ Push Notification Failed:", str(e))
        return False

class PushTokenUpdate(BaseModel):
    token: str

@router.put("/push-token")
def update_push_token(req: PushTokenUpdate, user=Depends(get_current_user)):
    user_collection.update_one(
        {"email": user.get("email") or user.get("sub")},
        {"$set": {"push_token": req.token}}
    )
    return {"message": "Push token linked to device."}

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
