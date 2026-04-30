from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

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

# ROOT
@app.get("/")
def root():
    return {"message": "Evalis Backend Running 🚀"}