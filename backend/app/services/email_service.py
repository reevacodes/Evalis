import os
import base64
import logging
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

def get_gmail_service():
    """Authenticates and returns the Gmail API service."""
    creds = None
    token_path = os.path.join(os.getcwd(), 'token.json')
    
    # 1. Check if token is provided via Render Environment Variables
    import json
    token_env = os.getenv('GMAIL_TOKEN_JSON')
    if token_env:
        try:
            token_info = json.loads(token_env)
            creds = Credentials.from_authorized_user_info(token_info, ['https://www.googleapis.com/auth/gmail.send'])
        except Exception as e:
            logger.error(f"Failed to parse GMAIL_TOKEN_JSON: {e}")
            
    # 2. Fallback to local token.json file
    if not creds and os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, ['https://www.googleapis.com/auth/gmail.send'])
        
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            from google.auth.transport.requests import Request
            try:
                creds.refresh(Request())
                with open(token_path, 'w') as token:
                    token.write(creds.to_json())
            except Exception as e:
                logger.error(f"Failed to refresh Gmail token: {e}")
                return None
        else:
            logger.error("No valid token.json found! Cannot authenticate Gmail API.")
            return None
            
    try:
        service = build('gmail', 'v1', credentials=creds)
        return service
    except Exception as e:
        logger.error(f"Failed to build Gmail service: {e}")
        return None

def format_to_ist(iso_string: str) -> str:
    """Converts a UTC iso string to a nicely formatted IST string."""
    if not iso_string:
        return "Not Set"
    try:
        from datetime import datetime, timedelta
        is_utc = "Z" in iso_string or "+00:00" in iso_string or iso_string.endswith("+00:00")
        clean_time = str(iso_string).replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_time)
        from datetime import timezone
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ist_timezone = timezone(timedelta(hours=5, minutes=30))
        dt_ist = dt.astimezone(ist_timezone)
        return dt_ist.strftime("%A, %d/%m/%Y at %I:%M %p")
    except Exception as e:
        logger.warning(f"Failed to parse time for email {iso_string}: {e}")
        return str(iso_string)

def _send_email(to_emails, subject: str, body: str) -> bool:
    if isinstance(to_emails, str):
        to_emails = [to_emails]

    service = get_gmail_service()
    if not service:
        logger.warning(f"Gmail API not configured or token missing. Mocking email to {to_emails}")
        print(f"\n{'='*40}\n[MOCK EMAIL] To: {to_emails}\nSubject: {subject}\n{'='*40}\n")
        return True

    try:
        message = MIMEText(body)
        sender = os.getenv("SENDER_EMAIL", "evalis.team@gmail.com").strip('\"\'')
        
        message['To'] = ", ".join(to_emails)
        message['From'] = sender
        message['Subject'] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {'raw': encoded_message}
        
        send_message = (service.users().messages().send(userId="me", body=create_message).execute())
        logger.info(f"Email sent successfully via Gmail API: {send_message['id']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_emails} via Gmail API: {str(e)}")
        return False

def send_password_reset_email(to_email: str, reset_link: str):
    subject = "Evalis - Password Reset Request"
    body = f"""Hello,

We received a request to reset your password for your Evalis account. 
Please click the link below to securely set a new password:

{reset_link}

If you did not request this, you can safely ignore this email.

Regards,
Evalis Core Systems"""
    success = _send_email(to_email, subject, body)
    if not success:
        print(f"[FALLBACK LOG] Reset link for {to_email}: {reset_link}")
    return success

def send_exam_publish_email(to_email: str, exam_name: str, subject_code: str, start_time: str, duration: int):
    formatted_time = format_to_ist(start_time)
    subject = f"Evalis - New Examination Published: {exam_name}"
    body = f"""Hello,

A new examination has been scheduled and published by your instructor.

Exam Details:
- Name: {exam_name}
- Subject Code: {subject_code}
- Scheduled Time: {formatted_time}
- Duration: {duration} minutes

Please log in to your Evalis portal or mobile app to view further details and prepare for the assessment.

Regards,
Evalis Assessment Platform"""
    return _send_email(to_email, subject, body)

def send_bulk_official_exam_reminder_emails(to_emails: list, exam_name: str, subject_code: str, start_time: str, duration: int, days_left: int):
    if not to_emails:
        return True
    formatted_time = format_to_ist(start_time)
    if days_left == 0:
        subject = f"URGENT: Your Exam '{exam_name}' is TODAY!"
        timeline_msg = "is scheduled for TODAY."
    else:
        subject = f"Reminder: '{exam_name}' is in {days_left} Days"
        timeline_msg = f"is scheduled to start in exactly {days_left} days."

    body = f"""Hello,

This is an automated reminder that your official examination '{exam_name}' {timeline_msg}

Exam Details:
- Name: {exam_name}
- Subject Code: {subject_code}
- Scheduled Time: {formatted_time}
- Duration: {duration} minutes

Please log in to your Evalis portal or mobile app at the scheduled time to take the assessment.
Make sure you have a stable internet connection.

Regards,
Evalis Assessment Platform"""
    return _send_email(to_emails, subject, body)

def send_official_exam_reminder_email(to_email: str, exam_name: str, subject_code: str, start_time: str, duration: int, days_left: int):
    formatted_time = format_to_ist(start_time)
    if days_left == 0:
        subject = f"URGENT: Your Exam '{exam_name}' is TODAY!"
        timeline_msg = "is scheduled for TODAY."
    else:
        subject = f"Reminder: '{exam_name}' is in {days_left} Days"
        timeline_msg = f"is scheduled to start in exactly {days_left} days."

    body = f"""Hello,

This is an automated reminder that your official examination '{exam_name}' {timeline_msg}

Exam Details:
- Name: {exam_name}
- Subject Code: {subject_code}
- Scheduled Time: {formatted_time}
- Duration: {duration} minutes

Please log in to your Evalis portal or mobile app at the scheduled time to take the assessment.
Make sure you have a stable internet connection.

Regards,
Evalis Assessment Platform"""
    return _send_email(to_email, subject, body)

def send_reschedule_status_email(to_email: str, exam_name: str, status: str, new_time: str = None):
    subject = f"Evalis - Reschedule Request {status.capitalize()}: {exam_name}"
    formatted_time = format_to_ist(new_time) if new_time else None
    if status.lower() == "approved":
        body = f"""Hello,

Your request to reschedule the examination '{exam_name}' has been APPROVED by your instructor.

Your new scheduled time is: {formatted_time}

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
    return _send_email(to_email, subject, body)

def send_exam_timing_updated_email(to_email: str, exam_name: str, new_time: str):
    subject = f"Evalis - Exam Timing Updated: {exam_name}"
    formatted_time = format_to_ist(new_time)
    body = f"""Hello,

Please be advised that the administration has updated the schedule for your upcoming examination: '{exam_name}'.

The new official start time is: {formatted_time}

Please check your Evalis dashboard for the most up-to-date information.

Regards,
Evalis Assessment Platform"""
    return _send_email(to_email, subject, body)

def send_results_published_email(to_email: str, exam_name: str, score: float, total: float):
    subject = f"Evalis - Results Published: {exam_name}"
    body = f"""Hello,

Your instructor has published the results for the examination: '{exam_name}'.

Your Score: {score} / {total}

Please log in to your Evalis portal or mobile app to view the detailed breakdown and analytics.

Regards,
Evalis Assessment Platform"""
    return _send_email(to_email, subject, body)

def send_mock_scheduled_email(to_email: str, exam_name: str, scheduled_time: str, is_reminder: bool = False):
    formatted_time = format_to_ist(scheduled_time)
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
    return _send_email(to_email, subject, body)

def send_welcome_email(primary_email: str, college_email: str, name: str):
    subject = "Welcome to Evalis Assessment Platform!"
    body = f"""Hello {name},

Welcome to the Evalis Assessment Platform! Your student account has been successfully created.

You can now log in via our web portal or the Evalis mobile app to access your dashboard, upcoming exams, and practice archives.

IMPORTANT: Please log in using your college email address moving forward.

We're excited to have you on board!

Regards,
Evalis Assessment Platform"""
    emails_to_send = [email for email in [primary_email, college_email] if email]
    return _send_email(emails_to_send, subject, body)

def send_signup_otp_email(to_email: str, name: str, otp: str):
    subject = f"Evalis - Your Verification Code: {otp}"
    body = f"""Hello {name},

Thank you for registering with the Evalis Assessment Platform!
To complete your sign-up, please use the following One-Time Password (OTP):

{otp}

This code will expire in 10 minutes. If you did not request this, please ignore this email.

Regards,
Evalis Assessment Platform"""
    return _send_email(to_email, subject, body)

def send_teacher_invite_email(to_email: str, name: str, invite_link: str):
    subject = "You've been invited as a Teacher to Evalis"
    body = f"""Hello {name},

You have been invited to join the Evalis Assessment Platform as a teacher!

Please click the link below to securely set your password and activate your account:
{invite_link}

This link will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.

Regards,
Evalis Admin"""
    success = _send_email(to_email, subject, body)
    if not success:
        print(f"\n{'='*50}\n🚨 Email failed to send, but you can manually share this invite link:\n{invite_link}\n{'='*50}\n")
    return success
