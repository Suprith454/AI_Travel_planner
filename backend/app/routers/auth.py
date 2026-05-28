from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import hashlib
import os
import random
import string

from ..database import get_db
from ..models import User, OTP
from ..schemas import UserCreate, UserLogin, UserResponse, OTPRequest, OTPVerify, ResetPassword
from ..email_utils import send_otp_email, send_welcome_email

router = APIRouter()


def hash_password(password: str) -> str:
    salt = os.getenv("SECRET_KEY", "default-secret")
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def clean_expired_otps(db: Session):
    db.query(OTP).filter(OTP.expires_at < datetime.now(timezone.utc)).delete()
    db.commit()


# ─── Signup OTP ────────────────────────────────────────────

@router.post("/signup")
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            db.delete(existing)
            db.commit()

    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    clean_expired_otps(db)
    db.query(OTP).filter(OTP.email == user_data.email, OTP.purpose == "signup").delete()

    db.add(OTP(email=user_data.email, code=otp_code, purpose="signup", expires_at=expires_at))

    user = User(email=user_data.email, hashed_password=hash_password(user_data.password), is_active=False)
    db.add(user)
    db.commit()

    email_sent = send_otp_email(user_data.email, otp_code, "signup")
    return {"message": "OTP sent to email", "email": user_data.email, "email_sent": email_sent}


# ─── Verify OTP ────────────────────────────────────────────

@router.post("/verify-otp")
def verify_otp(data: OTPVerify, db: Session = Depends(get_db)):
    clean_expired_otps(db)

    otp = db.query(OTP).filter(
        OTP.email == data.email,
        OTP.code == data.code,
        OTP.purpose == data.purpose,
        OTP.expires_at > datetime.now(timezone.utc),
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    db.query(OTP).filter(OTP.email == data.email).delete()
    db.commit()
    db.refresh(user)

    if data.purpose == "signup":
        send_welcome_email(data.email)

    return {"user_id": user.id, "email": user.email, "message": "Verification successful"}


# ─── Login ────────────────────────────────────────────

@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or user.hashed_password != hash_password(user_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Please verify your email first. Check your inbox for the OTP.")
    return {"user_id": user.id, "email": user.email, "message": "Login successful"}


# ─── Resend OTP ────────────────────────────────────────────

@router.post("/resend-otp")
def resend_otp(data: OTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    if data.purpose == "signup" and user.is_active:
        raise HTTPException(status_code=400, detail="Account already verified")

    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    clean_expired_otps(db)
    db.query(OTP).filter(OTP.email == data.email, OTP.purpose == data.purpose).delete()
    db.add(OTP(email=data.email, code=otp_code, purpose=data.purpose, expires_at=expires_at))
    db.commit()

    email_sent = send_otp_email(data.email, otp_code, data.purpose)
    return {"message": "OTP resent", "email_sent": email_sent}


# ─── Forgot Password (send OTP) ────────────────────────────

@router.post("/forgot-password")
def forgot_password(data: OTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")

    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    clean_expired_otps(db)
    db.query(OTP).filter(OTP.email == data.email, OTP.purpose == "reset").delete()
    db.add(OTP(email=data.email, code=otp_code, purpose="reset", expires_at=expires_at))
    db.commit()

    email_sent = send_otp_email(data.email, otp_code, "reset")
    return {"message": "Reset code sent to email", "email_sent": email_sent}


# ─── Reset Password ────────────────────────────────────────

@router.post("/reset-password")
def reset_password(data: ResetPassword, db: Session = Depends(get_db)):
    clean_expired_otps(db)

    otp = db.query(OTP).filter(
        OTP.email == data.email,
        OTP.code == data.code,
        OTP.purpose == "reset",
        OTP.expires_at > datetime.now(timezone.utc),
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(data.new_password)
    db.query(OTP).filter(OTP.email == data.email).delete()
    db.commit()

    return {"message": "Password reset successful"}
