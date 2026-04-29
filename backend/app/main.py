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

@app.get("/test-smtp")
def test_smtp():
    import smtplib
    import os
    server = os.getenv("SMTP_SERVER", "").strip('\"\'')
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip('\"\'')
    pw = os.getenv("SMTP_PASSWORD", "").strip('\"\'')
    try:
        if port == 465:
            s = smtplib.SMTP_SSL(server, port, timeout=10)
        else:
            s = smtplib.SMTP(server, port, timeout=10)
            s.starttls()
        s.login(user, pw)
        s.quit()
        return {"status": "SUCCESS", "message": "SMTP connection to Gmail was fully successful!"}
    except Exception as e:
        return {"status": "ERROR", "error_message": str(e), "hint": "If this is SMTPAuthenticationError, check your Gmail inbox for a Critical Security Alert and click 'Yes it was me'. Or, try changing SMTP_PORT to 465 in your Render environment variables."}

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