from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from .database import engine, Base
from .routers import auth, trips, chat, weather, nearby, tools

Base.metadata.create_all(bind=engine)

try:
    with engine.connect() as conn:
        insp = inspect(conn)
        if "users" in insp.get_table_names():
            cols = [c["name"] for c in insp.get_columns("users")]
            if "is_active" not in cols:
                is_pg = "postgresql" in str(engine.url)
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT false" if is_pg
                    else "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 0"
                ))
            if "name" not in cols:
                is_pg = "postgresql" in str(engine.url)
                conn.execute(text(
                    'ALTER TABLE users ADD COLUMN "name" VARCHAR DEFAULT \'\'' if is_pg
                    else "ALTER TABLE users ADD COLUMN name VARCHAR DEFAULT ''"
                ))
            if "trips" in insp.get_table_names():
                trip_cols = [c["name"] for c in insp.get_columns("trips")]
                if "share_token" not in trip_cols:
                    conn.execute(text('ALTER TABLE trips ADD COLUMN share_token VARCHAR'))
                    conn.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_trips_share_token ON trips (share_token)'))
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
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(weather.router, prefix="/api", tags=["weather"])
app.include_router(nearby.router, prefix="/api", tags=["nearby"])
app.include_router(tools.router, prefix="/api", tags=["tools"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
