from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.user_schema import UserSignup, UserLogin, LoginResponse
from app.models.user_model import create_user, get_user_by_email
from app.utils.security import hash_password, verify_password
from app.utils.jwt_handler import create_access_token, decode_token
from jose import JWTError
from app.database import db
from pymongo.errors import DuplicateKeyError
from app.utils.auth_dependency import get_current_user
from app.database import get_db
from app.models.user_model import update_user_role, update_user_password
from app.utils.auth_dependency import get_current_user, require_admin
from app.services.email_service import send_password_reset_email, send_welcome_email
from app.services.activity_service import log_activity
from pydantic import BaseModel

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

router = APIRouter()


# =========================
# 🟢 SIGNUP
# =========================
@router.post("/signup")
def signup(user: UserSignup):
    # Hash password
    hashed_password = hash_password(user.password)

    # Create user
    try:
        create_user(
            db,
            email=user.email.strip().lower(),
            hashed_password=hashed_password,
            role=user.role,
            name=user.name,
            semester=user.semester,
            college_email=user.college_email.strip().lower() if user.college_email else None,
            college_name=user.college_name,
            student_id=user.student_id
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # Send welcome email asynchronously (or synchronously here)
    if user.role == "student":
        send_welcome_email(
            primary_email=user.email,
            college_email=user.college_email,
            name=user.name
        )

    log_activity(
        actor_id="system",
        actor_name="System",
        role="system",
        action="New Registration",
        details=f"New user registered: {user.name} ({user.role})"
    )

    return {
    "message": "User created successfully",
    "user": {
        "email": user.email,
        "name": user.name,
        "role": user.role
    }
}


# =========================
# 🔵 LOGIN
# =========================
@router.post("/login", response_model=LoginResponse)
def login(user: UserLogin):
    # Fetch user
    email_to_check = user.email.strip().lower()
    db_user = get_user_by_email(db, email_to_check)

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Verify password
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Create token
    token = create_access_token({
        "sub": db_user["email"],
        "role": db_user["role"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "email": db_user["email"],
            "name": db_user.get("name", ""),
            "role": db_user["role"]
        }
    }


# =========================
# 🟡 GET CURRENT USER
# =========================

@router.get("/me")
def get_me(user = Depends(get_current_user)):
    db_user = get_user_by_email(db, user["sub"])

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "email": db_user["email"],
        "name": db_user.get("name", ""),
        "role": db_user["role"]
    }

@router.put("/admin/make-admin")
def make_admin(
    email: str, 
    db=Depends(get_db),
    admin_user=Depends(require_admin) # 🔒 This locks the route!
):
    update_user_role(db, email, "admin")
    return {"message": f"User {email} is now admin"}


# =========================
# 🟣 FORGOT PASSWORD
# =========================
@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    db_user = get_user_by_email(db, req.email)
    
    if not db_user:
        return {"message": "If the email is registered, a password reset link will be sent."}
    
    # Generate a JWT token valid for 15 minutes
    reset_token = create_access_token({
        "sub": req.email,
        "purpose": "password_reset"
    })
    
    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
    
    # Send email
    send_password_reset_email(req.email, reset_link)
    
    return {"message": "If the email is registered, a password reset link will be sent."}

# =========================
# 🔴 RESET PASSWORD
# =========================
@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    try:
        payload = decode_token(req.token)
        email = payload.get("sub")
        purpose = payload.get("purpose")
        
        if purpose != "password_reset" or not email:
            raise HTTPException(status_code=400, detail="Invalid or expired token")
            
        db_user = get_user_by_email(db, email)
        if not db_user:
            raise HTTPException(status_code=400, detail="User not found")
            
        # Hash new password and update
        hashed_password = hash_password(req.new_password)
        update_user_password(db, email, hashed_password)
        
        return {"message": "Password successfully reset. You can now log in."}
        
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
