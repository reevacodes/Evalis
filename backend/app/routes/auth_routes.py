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
from pydantic import BaseModel, EmailStr

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class SendOtpRequest(BaseModel):
    email: EmailStr
    name: str

router = APIRouter()

# =========================
# 📨 SEND OTP
# =========================
@router.post("/send-signup-otp")
def send_signup_otp(req: SendOtpRequest):
    import random
    from datetime import datetime, timedelta
    from app.services.email_service import send_signup_otp_email
    
    clean_email = req.email.strip().lower()
    
    # Check if user already exists
    if get_user_by_email(db, clean_email):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    otp_code = str(random.randint(100000, 999999))
    
    db["otp_collection"].update_one(
        {"email": clean_email},
        {"$set": {
            "email": clean_email,
            "otp": otp_code,
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        }},
        upsert=True
    )
    
    send_signup_otp_email(clean_email, req.name, otp_code)
    return {"message": "OTP sent successfully"}

# =========================
# 🟢 SIGNUP
# =========================
@router.post("/signup")
def signup(user: UserSignup):
    from datetime import datetime
    
    clean_email = user.email.strip().lower()
    
    # Verify OTP
    otp_record = db["otp_collection"].find_one({"email": clean_email, "otp": user.otp})
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if otp_record.get("expires_at", datetime.utcnow()) < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    # Delete OTP after verification
    db["otp_collection"].delete_one({"_id": otp_record["_id"]})

    # Hash password
    hashed_password = hash_password(user.password)

    # Create user
    try:
        create_user(
            db,
            email=clean_email,
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
        
        # Notify Admins
        from app.routes.notification_routes import notify_admins
        notify_admins(
            title="New Student Registration",
            message=f"{user.name} ({user.email}) has just registered on the platform.",
            link="/admin/users"
        )

    extra_details = f" | College: {user.college_name} | ID: {user.student_id}" if user.role == "student" and user.college_name else ""
    log_activity(
        actor_id="system",
        actor_name="System",
        role="system",
        action="New Registration",
        details=f"New user registered: {user.name} ({user.role}) | Email: {user.email}{extra_details}"
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

    # Check if active
    if db_user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active. Please set your password via the invite link."
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
            "role": db_user["role"],
            "student_id": db_user.get("student_id", "")
        }
    }

# =========================
# 🟠 SET PASSWORD (INVITE)
# =========================
class SetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/set-password")
def set_password(req: SetPasswordRequest):
    from app.database import invite_token_collection, user_collection
    from datetime import datetime
    
    token_record = invite_token_collection.find_one({"token": req.token})
    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid token")
        
    if token_record.get("used"):
        raise HTTPException(status_code=400, detail="Token already used")
        
    if token_record.get("expires_at") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token has expired")
        
    email = token_record["email"]
    db_user = get_user_by_email(db, email)
    if not db_user:
        raise HTTPException(status_code=400, detail="User not found")
        
    # Hash new password and update
    hashed_password = hash_password(req.new_password)
    user_collection.update_one(
        {"email": email},
        {"$set": {"password": hashed_password, "is_active": True}}
    )
    
    # Mark token as used
    invite_token_collection.update_one(
        {"_id": token_record["_id"]},
        {"$set": {"used": True}}
    )
    
    # Notify Admins
    from app.routes.notification_routes import notify_admins
    notify_admins(
        title="Teacher Account Activated",
        message=f"{db_user.get('name', email)} has set their password and activated their teacher account.",
        link="/admin/users"
    )
    
    return {"message": "Password successfully set. You can now log in."}



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
        "role": db_user["role"],
        "student_id": db_user.get("student_id", "")
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
from fastapi import Request

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request):
    clean_email = req.email.strip().lower()
    db_user = get_user_by_email(db, clean_email)
    
    if not db_user:
        return {"message": "If the email is registered, a password reset link will be sent."}
    
    # Generate a JWT token valid for 15 minutes
    reset_token = create_access_token({
        "sub": clean_email,
        "purpose": "password_reset"
    })
    
    frontend_url = request.headers.get("origin") or "http://localhost:5173"
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
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
