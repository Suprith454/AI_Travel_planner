from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import hashlib
import os

from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserLogin
from ..email_utils import send_welcome_email

router = APIRouter()


def hash_password(password: str) -> str:
    salt = os.getenv("SECRET_KEY", "default-secret")
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()


# ─── Signup ─────────────────────────────────────────────────

@router.post("/signup")
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Email already registered")
        db.delete(existing)
        db.commit()

    user = User(name=user_data.name, email=user_data.email, hashed_password=hash_password(user_data.password), is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    send_welcome_email(user.email, user.name)

    return {"user_id": user.id, "email": user.email, "name": user.name, "message": "Account created"}


# ─── Login ────────────────────────────────────────────

@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or user.hashed_password != hash_password(user_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"user_id": user.id, "email": user.email, "name": user.name, "message": "Login successful"}
