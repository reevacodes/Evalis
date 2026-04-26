from app.database import activity_log_collection
from datetime import datetime, timezone

def log_activity(actor_id: str, actor_name: str, role: str, action: str, details: str):
    """
    Logs an activity to the global audit trail.
    """
    doc = {
        "actor_id": actor_id,
        "actor_name": actor_name,
        "role": role,
        "action": action,
        "details": details,
        "timestamp": datetime.now(timezone.utc)
    }
    activity_log_collection.insert_one(doc)
