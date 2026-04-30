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
    import resend
    
    api_key = os.getenv("RESEND_API_KEY", "")
    sender = os.getenv("SENDER_EMAIL", "onboarding@resend.dev").strip('\"\'')
    
    if not api_key:
        return {"status": "ERROR", "error_message": "RESEND_API_KEY is missing from environment variables."}
        
    resend.api_key = api_key
    
    try:
        params = {
            "from": sender,
            "to": [sender], # Sending to the sender email as a test (must be registered email if domain not verified)
            "subject": "Evalis - Resend API Test",
            "text": "If you are reading this, Resend API is working perfectly on Render!",
        }
        resend.Emails.send(params)
        return {"status": "SUCCESS", "message": "Email sent successfully via Resend!"}
    except Exception as e:
        return {"status": "ERROR", "error_message": str(e), "hint": "If using onboarding@resend.dev, you can only send to the email address you signed up to Resend with."}

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