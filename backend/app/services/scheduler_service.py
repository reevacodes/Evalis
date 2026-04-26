from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.database import past_papers_collection, user_collection
from app.services.email_service import send_mock_scheduled_email
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

def check_and_send_mock_reminders():
    """
    Checks for mock tests scheduled within the next 24 hours
    that haven't had a reminder sent yet.
    """
    try:
        now = datetime.now(timezone.utc)
        tomorrow = now + timedelta(hours=24)

        query = {
            "exam_type": "Practice",
            "is_instant": False,
            "reminder_sent": {"$ne": True},
            "start_time": {
                "$gte": now,
                "$lte": tomorrow
            }
        }

        upcoming_mocks = list(past_papers_collection.find(query))

        if not upcoming_mocks:
            return

        logger.info(f"Found {len(upcoming_mocks)} upcoming mock tests for reminder.")

        for mock in upcoming_mocks:
            assigned_emails = mock.get("assigned_to", [])
            exam_name = mock.get("exam_name", "Mock Test")
            start_time_str = str(mock.get("start_time"))
            
            for email in assigned_emails:
                success = send_mock_scheduled_email(
                    to_email=email,
                    exam_name=exam_name,
                    scheduled_time=start_time_str,
                    is_reminder=True
                )
                
            # Mark as reminder sent so we don't spam
            past_papers_collection.update_one(
                {"_id": mock["_id"]},
                {"$set": {"reminder_sent": True}}
            )

    except Exception as e:
        logger.error(f"Error checking mock reminders: {str(e)}")

def start_scheduler():
    if not scheduler.running:
        # Run the check every 1 hour (or 15 minutes for faster testing)
        scheduler.add_job(
            func=check_and_send_mock_reminders,
            trigger=IntervalTrigger(minutes=15),
            id='mock_test_reminder_job',
            name='Check and send mock test reminders',
            replace_existing=True
        )
        scheduler.start()
        logger.info("APScheduler started successfully.")
        
        # Run it once immediately on boot
        try:
            check_and_send_mock_reminders()
        except Exception:
            pass

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
