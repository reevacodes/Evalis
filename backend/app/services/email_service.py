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
