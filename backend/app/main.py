from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from .database import engine, Base
from .routers import auth, trips, photos

Base.metadata.create_all(bind=engine)

try:
    with engine.connect() as conn:
        insp = inspect(conn)
        if "users" in insp.get_table_names() and "is_active" not in [c["name"] for c in insp.get_columns("users")]:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 0"))
            conn.commit()
except Exception:
    pass

app = FastAPI(title="AI Travel Planner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ai-travel-planner-8x4z.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(trips.router, prefix="/api/trips", tags=["trips"])
app.include_router(photos.router, prefix="/api", tags=["photos"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
