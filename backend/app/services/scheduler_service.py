from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.database import past_papers_collection, user_collection, exam_collection
from app.services.email_service import send_mock_scheduled_email, send_bulk_official_exam_reminder_emails
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

def check_and_send_official_exam_reminders():
    """
    Checks for officially published exams and sends:
    - 2 Days before reminder
    - Same day (within 24h) reminder
    """
    try:
        now = datetime.now(timezone.utc)
        
        # We only care about published exams that are in the future
        query = {
            "status": "published",
            "is_deleted": {"$ne": True},
            "start_time": {"$gte": now}
        }
        
        upcoming_exams = list(exam_collection.find(query))
        
        if not upcoming_exams:
            return
            
        students = list(user_collection.find({"role": "student"}))
        if not students:
            return
            
        student_emails = []
        for s in students:
            c_mail = s.get("college_email")
            if c_mail and "mietjammu.in" in c_mail:
                student_emails.append(c_mail)
            elif s.get("email"):
                student_emails.append(s.get("email"))

        for exam in upcoming_exams:
            start_time = exam.get("start_time")
            if not start_time:
                continue
                
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
                
            time_diff = start_time - now
            days_until_exam = time_diff.total_seconds() / 86400.0
            
            # Convert to IST for calendar-day comparison
            now_ist = now + timedelta(hours=5, minutes=30)
            start_ist = start_time + timedelta(hours=5, minutes=30)
            
            is_same_day = now_ist.date() == start_ist.date()
            is_after_8am = now_ist.hour >= 8
            
            # Send 2-days before reminder (if between 1.5 and 2.5 days)
            if 1.5 <= days_until_exam <= 2.5 and not exam.get("reminder_2d_sent"):
                logger.info(f"Sending 2-day reminder for exam {exam.get('exam_name')} to {len(student_emails)} students")
                send_bulk_official_exam_reminder_emails(
                    to_emails=student_emails,
                    exam_name=exam.get("exam_name"),
                    subject_code=exam.get("subject_code"),
                    start_time=start_time.isoformat(),
                    duration=exam.get("duration", 60),
                    days_left=2
                )
                exam_collection.update_one({"_id": exam["_id"]}, {"$set": {"reminder_2d_sent": True}})
                
            # Send same day reminder (On exam day, at or after 8 AM IST)
            elif is_same_day and is_after_8am and not exam.get("reminder_same_day_sent"):
                logger.info(f"Sending SAME-DAY 8 AM reminder for exam {exam.get('exam_name')} to {len(student_emails)} students")
                send_bulk_official_exam_reminder_emails(
                    to_emails=student_emails,
                    exam_name=exam.get("exam_name"),
                    subject_code=exam.get("subject_code"),
                    start_time=start_time.isoformat(),
                    duration=exam.get("duration", 60),
                    days_left=0
                )
                exam_collection.update_one({"_id": exam["_id"]}, {"$set": {"reminder_same_day_sent": True}})
                
    except Exception as e:
        logger.error(f"Error checking official exam reminders: {str(e)}")

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
        scheduler.add_job(
            func=check_and_send_official_exam_reminders,
            trigger=IntervalTrigger(minutes=15),
            id='official_exam_reminder_job',
            name='Check and send official exam reminders',
            replace_existing=True
        )
        scheduler.start()
        logger.info("APScheduler started successfully.")
        
        # Run it once immediately on boot
        try:
            check_and_send_mock_reminders()
            check_and_send_official_exam_reminders()
        except Exception:
            pass

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
