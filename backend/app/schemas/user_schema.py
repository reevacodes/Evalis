from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal
import re


# =========================
# 🟢 SIGNUP SCHEMA
# =========================
class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    name: str
    role: Literal["student", "teacher"]
    semester: int | None = None
    college_email: EmailStr | None = None
    college_name: str | None = None
    student_id: str | None = None
    otp: str

    @field_validator('password')
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[@$!%*?&#^_-]", v):
            raise ValueError("Password must contain at least one special character")
        return v


# =========================
# 🔵 LOGIN SCHEMA
# =========================
class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


# =========================
# 🟡 RESPONSE SCHEMA (SAFE)
# =========================
class UserResponse(BaseModel):
    email: EmailStr
    name: str
    role: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse