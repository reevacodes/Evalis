import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Config from environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

def send_password_reset_email(to_email: str, reset_link: str):
    """
    Sends a password reset link to the user.
    If SMTP credentials are not configured, logs it to console for local testing.
    """
    subject = "Evalis - Password Reset Request"
    body = f"""Hello,

We received a request to reset your password for your Evalis account. 
Please click the link below to securely set a new password:

{reset_link}

If you did not request this, you can safely ignore this email.

Regards,
Evalis Core Systems"""

    if not SMTP_SERVER or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Mocking email to {to_email}")
        print(f"\n{'='*40}\n[MOCK EMAIL] To: {to_email}\nSubject: {subject}\nReset Link: {reset_link}\n{'='*40}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Password reset email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        # We will print it anyway as a fallback for devs
        print(f"[FALLBACK LOG] Reset link for {to_email}: {reset_link}")
        return False

def send_exam_publish_email(to_email: str, exam_name: str, subject_code: str, start_time: str, duration: int):
    """
    Sends an email notification to a student when a new exam is published.
    """
    subject = f"Evalis - New Examination Published: {exam_name}"
    body = f"""Hello,

A new examination has been scheduled and published by your instructor.

Exam Details:
- Name: {exam_name}
- Subject Code: {subject_code}
- Scheduled Time: {start_time}
- Duration: {duration} minutes

Please log in to your Evalis portal or mobile app to view further details and prepare for the assessment.

Regards,
Evalis Assessment Platform"""

    if not SMTP_SERVER or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Mocking exam publish email to {to_email}")
        print(f"\n{'='*40}\n[MOCK EMAIL] To: {to_email}\nSubject: {subject}\n{'='*40}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Failed to send publish email to {to_email}: {str(e)}")
        return False

def send_reschedule_status_email(to_email: str, exam_name: str, status: str, new_time: str = None):
    """
    Sends an email notification to a student when their reschedule request is approved or rejected.
    """
    subject = f"Evalis - Reschedule Request {status.capitalize()}: {exam_name}"
    
    if status.lower() == "approved":
        body = f"""Hello,

Your request to reschedule the examination '{exam_name}' has been APPROVED by your instructor.

Your new scheduled time is: {new_time}

Please log in to your Evalis portal or mobile app to view the updated details.

Regards,
Evalis Assessment Platform"""
    else:
        body = f"""Hello,

Your request to reschedule the examination '{exam_name}' has been REJECTED by your instructor. 
The original scheduled time remains in effect.

Please contact your instructor if you have further questions.

Regards,
Evalis Assessment Platform"""

    if not SMTP_SERVER or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Mocking reschedule email to {to_email}")
        print(f"\n{'='*40}\n[MOCK EMAIL] To: {to_email}\nSubject: {subject}\n{'='*40}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Failed to send reschedule email to {to_email}: {str(e)}")
        return False

def send_results_published_email(to_email: str, exam_name: str, score: float, total: float):
    """
    Sends an email to the student when results are published.
    """
    subject = f"Evalis - Results Published: {exam_name}"
    body = f"""Hello,

Your instructor has published the results for the examination: '{exam_name}'.

Your Score: {score} / {total}

Please log in to your Evalis portal or mobile app to view the detailed breakdown and analytics.

Regards,
Evalis Assessment Platform"""

    if not SMTP_SERVER or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Mocking results email to {to_email}")
        print(f"\n{'='*40}\n[MOCK EMAIL] To: {to_email}\nSubject: {subject}\nScore: {score}/{total}\n{'='*40}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Failed to send results email to {to_email}: {str(e)}")
        return False

def send_mock_scheduled_email(to_email: str, exam_name: str, scheduled_time: str, is_reminder: bool = False):
    """
    Sends an email to the student when a mock test is scheduled, and acts as a reminder.
    """
    # Parse and format the time
    formatted_time = scheduled_time
    try:
        from datetime import datetime, timedelta
        # Handle string formats safely
        # Some strings might not have timezone info, or might use Z
        clean_time = scheduled_time.replace("Z", "+00:00")
        # Split timezone from string if naive parsing is tricky, but fromisoformat handles most Python formats
        if "+" not in clean_time and "-" not in clean_time[10:]: # Basic check for offset
            clean_time += "+00:00"
        dt = datetime.fromisoformat(clean_time)
        # Convert to IST (+05:30)
        dt_ist = dt + timedelta(hours=5, minutes=30)
        formatted_time = dt_ist.strftime("%d-%m-%Y at %I:%M %p (IST)")
    except Exception as e:
        logger.warning(f"Failed to parse time for email: {e}")
        pass

    subject = f"Evalis - Reminder: Mock Test Scheduled" if is_reminder else f"Evalis - Mock Test Scheduled: {exam_name}"
    
    greeting = "Just a quick reminder that you have a mock test scheduled today!" if is_reminder else "You have successfully scheduled a new mock test."

    body = f"""Hello,

{greeting}

Mock Test Details:
- Exam Name: {exam_name}
- Scheduled Time: {formatted_time}

Make sure to log in to your Evalis portal a few minutes early to prepare. Good luck!

Regards,
Evalis Assessment Platform"""

    if not SMTP_SERVER or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Mocking mock scheduling email to {to_email}")
        print(f"\n{'='*40}\n[MOCK EMAIL] To: {to_email}\nSubject: {subject}\n{'='*40}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Failed to send mock scheduling email to {to_email}: {str(e)}")
        return False

def send_welcome_email(primary_email: str, college_email: str, name: str):
    """
    Sends a welcome email to the student upon successful signup.
    It attempts to send to both the primary email and college email.
    """
    subject = "Welcome to Evalis Assessment Platform!"
    body = f"""Hello {name},

Welcome to the Evalis Assessment Platform! Your student account has been successfully created.

You can now log in via our web portal or the Evalis mobile app to access your dashboard, upcoming exams, and practice archives.

IMPORTANT: Please log in using your college email address moving forward.

We're excited to have you on board!

Regards,
Evalis Assessment Platform"""

    emails_to_send = [email for email in [primary_email, college_email] if email]

    if not SMTP_SERVER or not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Mocking welcome email to {emails_to_send}")
        print(f"\n{'='*40}\n[MOCK EMAIL] To: {', '.join(emails_to_send)}\nSubject: {subject}\n{'='*40}\n")
        return True

    success = True
    for to_email in emails_to_send:
        try:
            msg = MIMEMultipart()
            msg['From'] = SMTP_USER
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
        except Exception as e:
            logger.error(f"Failed to send welcome email to {to_email}: {str(e)}")
            success = False
            
    return success
