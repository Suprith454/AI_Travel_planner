# AI Travel Planner — Project Overview

## What is it?
A website where you tell it where you want to go, and AI plans your entire trip — day by day — and shows it on a map.

---

## User Flow
1. Sign up / Log in
2. Click "Plan New Trip"
3. Fill a form: destination, dates, budget, interests
4. Click Generate → AI creates a custom itinerary
5. View it on a map with day-by-day cards
6. Save it and come back anytime

---

## Tech Stack
| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React.js | Most popular UI framework |
| Backend | Python + FastAPI | Easy AI integration |
| Database | PostgreSQL | Stores users & saved trips |
| AI | OpenAI / Claude API | Generates itineraries |
| Maps | Leaflet (free) | No API key needed |

## How It Works (simple)

```
User fills form in browser (React)
         ↓
Request sent to Python backend
         ↓
Python asks AI to create itinerary
         ↓
AI returns day-by-day plan with places
         ↓
Saved to database, sent back to screen
         ↓
React shows itinerary + pins on map
```

## Cost for Prototype
**~₹85–₹250 total.** Only the AI API costs money. Maps, database, hosting are all free on a prototype.

## What the AI Does
The AI handles everything — it suggests places, activities, timings, descriptions, and even location coordinates. No need for flight APIs, hotel APIs, or Google APIs.

## Why React + Python?
- **React**: Most widely used frontend framework, huge ecosystem
- **Python**: Easiest language for working with AI/LLM APIs

---

## Project Structure (planned)
```
AI_Travel_planner/
├── frontend/          # React app (what users see)
├── backend/           # Python FastAPI server (the brain)
└── database/          # Schema & migrations
```
