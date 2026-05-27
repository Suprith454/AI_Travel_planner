# AI Travel Planner

An AI-powered travel itinerary planner built with React (frontend) and Python FastAPI (backend). Generates personalized day-by-day trip plans with an interactive map.

## Features

- User authentication (signup/login)
- AI-generated travel itineraries via Groq (LLaMA 3)
- Interactive map with location pins (Leaflet + OpenStreetMap)
- Save, view, and delete trips
- Responsive design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Python + FastAPI |
| Database | SQLite (via SQLAlchemy) |
| AI | Groq API (LLaMA 3) |
| Maps | Leaflet + OpenStreetMap |
| Auth | SHA-256 hashed passwords |

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Groq API key (free) — get one at https://console.groq.com/keys

### 1. Clone the repo

```bash
git clone https://github.com/Suprith454/AI_Travel_planner.git
cd AI_Travel_planner
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:

```
DATABASE_URL=sqlite:///./travel_planner.db
GROQ_API_KEY=your-groq-api-key-here
SECRET_KEY=your-secret-key
USE_MOCK=false
```

Start the backend:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

Go to **http://localhost:5173** in your browser.

## Using Mock Mode

If you don't have a Groq API key, set `USE_MOCK=true` in `.env`. The app will use sample data so you can still test the full UI flow.

## Project Structure

```
AI_Travel_planner/
├── frontend/              # React app
│   └── src/
│       ├── pages/         # Login, Signup, Dashboard, PlanTrip, TripView
│       ├── components/    # Navbar, ItineraryMap
│       └── AuthContext.jsx
├── backend/
│   └── app/
│       ├── routers/       # auth.py, trips.py
│       ├── models.py      # Database models
│       ├── schemas.py     # Pydantic schemas
│       └── main.py        # FastAPI entry point
└── README.md
```
