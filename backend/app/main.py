from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

# Add file handler to root logger to capture all application logs
root_logger = logging.getLogger()
file_handler = logging.FileHandler("app.log")
file_formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
file_handler.setFormatter(file_formatter)
root_logger.addHandler(file_handler)
root_logger.setLevel(logging.INFO)

from app.routes.question_routes import router as question_router
from app.routes.curriculum_routes import router as curriculum_router
from app.routes.exam_routes import router as exam_router
from app.routes.code_routes import router as code_router
from app.routes.past_paper_routes import router as past_paper_router
from app.routes.admin_routes import router as admin_router
from app.routes import auth_routes

app = FastAPI()

from app.services.scheduler_service import start_scheduler, stop_scheduler

@app.on_event("startup")
def startup_event():
    start_scheduler()

@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()



@app.get("/test-email")
def test_email():
    import os
    import base64
    from email.mime.text import MIMEText
    from app.services.email_service import get_gmail_service

    sender = os.getenv("SENDER_EMAIL", "evalis.team@gmail.com").strip('\"\'')
    
    service = get_gmail_service()
    if not service:
        return {"status": "ERROR", "error_message": "Gmail API is not configured. Missing valid token.json in the backend directory."}
        
    try:
        message = MIMEText("If you are reading this, the Gmail API is working perfectly on Render!")
        message['To'] = sender # Sending to the sender email as a test
        message['From'] = sender
        message['Subject'] = "Evalis - Gmail API Test"

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {'raw': encoded_message}
        
        send_message = (service.users().messages().send(userId="me", body=create_message).execute())
        return {"status": "SUCCESS", "message": f"Email sent successfully via Gmail API! Message ID: {send_message['id']}"}
    except Exception as e:
        return {"status": "ERROR", "error_message": str(e)}

@app.get("/email-diagnostics")
def email_diagnostics():
    import os
    import json
    
    result = {
        "gmail_token_env_present": False,
        "gmail_token_env_valid_json": False,
        "gmail_token_env_keys": [],
        "gmail_token_env_has_refresh_token": False,
        "local_token_file_exists": False,
        "local_token_file_keys": [],
        "local_token_file_has_refresh_token": False,
        "sender_email": os.getenv("SENDER_EMAIL"),
        "gmail_service_status": "UNKNOWN",
        "gmail_service_error": None
    }
    
    token_env = os.getenv('GMAIL_TOKEN_JSON')
    if token_env:
        result["gmail_token_env_present"] = True
        try:
            token_info = json.loads(token_env)
            result["gmail_token_env_valid_json"] = True
            result["gmail_token_env_keys"] = list(token_info.keys())
            result["gmail_token_env_has_refresh_token"] = "refresh_token" in token_info and bool(token_info["refresh_token"])
        except Exception as e:
            result["gmail_token_env_valid_json"] = False
            result["gmail_token_env_error"] = str(e)
            
    token_path = os.path.join(os.getcwd(), 'token.json')
    if os.path.exists(token_path):
        result["local_token_file_exists"] = True
        try:
            with open(token_path, 'r') as f:
                token_info = json.load(f)
                result["local_token_file_keys"] = list(token_info.keys())
                result["local_token_file_has_refresh_token"] = "refresh_token" in token_info and bool(token_info["refresh_token"])
        except Exception as e:
            result["local_token_file_error"] = str(e)
            
    try:
        from app.services.email_service import get_gmail_service
        service = get_gmail_service()
        if service:
            result["gmail_service_status"] = "SUCCESS"
        else:
            result["gmail_service_status"] = "FAILED (Returned None)"
    except Exception as e:
        result["gmail_service_status"] = "ERROR"
        result["gmail_service_error"] = str(e)
        
    return result

@app.get("/email-logs")
def email_logs():
    import os
    log_path = "app.log"
    if not os.path.exists(log_path):
        return {"status": "NO_LOG_FILE", "logs": []}
    try:
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
            return {"status": "SUCCESS", "logs": lines[-150:]}
    except Exception as e:
        return {"status": "ERROR", "error_message": str(e)}

os.makedirs("uploads/reschedule_proofs", exist_ok=True)
app.mount("/static/reschedule_proofs", StaticFiles(directory="uploads/reschedule_proofs"), name="reschedule_proofs")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTES

# QUESTIONS
app.include_router(
    question_router,
    prefix="/questions",
    tags=["Questions"]
)

# CURRICULUM
app.include_router(
    curriculum_router,
    prefix="/curriculum",
    tags=["Curriculum"]
)

# EXAMS (CRITICAL FIX)
app.include_router(
    exam_router,
    prefix="/exam",
    tags=["Exam"]
)

# ADMIN
app.include_router(
    admin_router,
    prefix="/admin",
    tags=["Admin"]
)

# PAST PAPERS
app.include_router(
    past_paper_router,
    prefix="/past-papers",
    tags=["Past Papers"]
)

from app.routes.notification_routes import router as notification_router

# CODE RUNNER
app.include_router(
    code_router,
    prefix="/code",
    tags=["Code"]
)

# NOTIFICATIONS
app.include_router(
    notification_router,
    prefix="",
    tags=["Notifications"]
)

app.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])

# EXECUTOR DEBUG
@app.get("/executor-debug")
def executor_debug():
    import os
    return {
        "EXECUTOR_URL": os.getenv("EXECUTOR_URL"),
        "EXECUTOR_API_KEY_LENGTH": len(os.getenv("EXECUTOR_API_KEY") or "")
    }

# ROOT
@app.get("/")
def root():
    return {"message": "Evalis Backend Running 🚀"}