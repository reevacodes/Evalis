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
    import requests
    
    api_key = os.getenv("BREVO_API_KEY", "")
    sender = os.getenv("SENDER_EMAIL", "evalis.team@gmail.com").strip('\"\'')
    
    if not api_key:
        return {"status": "ERROR", "error_message": "BREVO_API_KEY is missing from environment variables."}
        
    try:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json"
        }
        payload = {
            "sender": {"email": sender, "name": "Evalis Test"},
            "to": [{"email": sender}], # Sending to the sender email as a test
            "subject": "Evalis - Brevo API Test",
            "textContent": "If you are reading this, Brevo API is working perfectly on Render!"
        }
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        return {"status": "SUCCESS", "message": "Email sent successfully via Brevo!"}
    except Exception as e:
        err_msg = str(e)
        if hasattr(e, 'response') and e.response is not None:
             err_msg += f" | Brevo API Response: {e.response.text}"
        return {"status": "ERROR", "error_message": err_msg, "hint": "Ensure your sender email is verified in Brevo."}

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