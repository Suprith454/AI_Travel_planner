# Technology Choices — Detailed Explanations

## 1. Why React?

**The problem:** We needed to build a modern, interactive web application with multiple pages (login, dashboard, trip planner, trip viewer with map), real-time updates, and complex state management.

**Alternatives considered:**
| Option | Pros | Cons |
|--------|------|------|
| Plain HTML/CSS/JS | Simple, no build tools | Impossible to manage complex state, no component reuse, manual DOM manipulation |
| Vue.js | Good, lighter than React | Smaller ecosystem, fewer libraries for maps/routing |
| Angular | Full framework | Overkill for this project, steep learning curve |
| Svelte | Modern, fast | Smaller community, fewer third-party integrations |

**Why React won:**
- **Largest ecosystem** — react-router-dom for routing, Leaflet for maps — all have React-specific wrappers
- **Component model** — Each page, the map, the navbar, the photo modal are isolated components with their own logic
- **Hooks** — `useState`, `useEffect`, `useContext` made state management clean (auth context, trip data loading)
- **Vite integration** — Vite was designed for React. Instant hot reload during development
- **Job market** — Most widely used frontend framework, good for portfolio
- **React 19** — Latest version with improved performance

**Trade-off:** Heavier than vanilla JS. But for a project with 5+ pages and complex state, it's worth it.

---

## 2. Why Vite (instead of Create React App or Next.js)?

**The problem:** We needed a build tool that compiles React code, provides a dev server with hot reload, and produces optimized production files.

**Alternatives considered:**
| Option | Pros | Cons |
|--------|------|------|
| Create React App (CRA) | Was the standard | Deprecated, slow builds, no longer maintained |
| Next.js | SSR, SEO-friendly, file-based routing | Overkill for a client-only app, more complexity |
| Parcel | Zero config | Smaller ecosystem, fewer plugins |

**Why Vite won:**
- **Speed** — Uses native ES modules. Dev server starts in <500ms vs CRA's 10-30 seconds
- **HMR (Hot Module Replacement)** — Changes reflect in <50ms without page reload
- **Simple** — Zero config for basic React projects, easy to add features via plugins
- **ES Modules** — Native import/export in browser during development, no bundling needed
- **Tree shaking** — Production builds only include used code (371KB gzipped to 113KB)

**Trade-off:** No SSR (Server-Side Rendering). Fine for this app — SEO is not needed for a login-gated tool.

---

## 3. Why Python + FastAPI (instead of Node.js, Django, Flask)?

**The problem:** We needed a backend server that handles authentication, database operations, external API calls (to Groq AI and Unsplash photos), and serves JSON to the frontend.

**Alternatives considered:**
| Option | Pros | Cons |
|--------|------|------|
| Node.js (Express) | Same language as frontend, fast | Callback-heavy, more boilerplate for async |
| Django | Full-featured, admin panel, ORM built-in | Heavy, too much for a simple API, opinionated |
| Flask | Lightweight, simple | No built-in validation, async support is weak |
| Go | Very fast, compiled | Steeper learning curve, more code for simple APIs |

**Why Python + FastAPI won:**
- **Async by default** — FastAPI handles concurrent requests efficiently using async/await
- **Automatic validation** — Pydantic models validate request/response data automatically. No manual checks
- **Auto-generated docs** — FastAPI creates Swagger docs at `/docs` automatically. Great for debugging
- **Python ecosystem** — `httpx` for external API calls, `sqlalchemy` for databases, `python-dotenv` for config
- **AI/ML integration** — If we wanted to add custom AI logic later (not just calling an API), Python is the standard
- **Minimal code** — The entire API is ~200 lines across 3 router files

**Trade-off:** Performance is lower than Go or Rust. But for an app handling <100 requests/minute, it's irrelevant.

---

## 4. Why Groq API (instead of OpenAI, Google Gemini, Claude)?

**The problem:** We needed an AI to generate travel itineraries from a text prompt. The AI needs to understand the request, plan activities across multiple days, and return structured JSON with places, costs, and coordinates.

**Alternatives considered:**
| Option | Pros | Cons |
|--------|------|------|
| OpenAI GPT-4 | Best quality | $$$, quota ran out after ~$5 |
| Google Gemini | Free tier available | Quota exhausted immediately (limit: 0) |
| Claude (Anthropic) | Good quality | No free tier, requires billing |
| Local model (Llama) | Free, private | Requires GPU, slow on CPU |
| Mock data | Always works, free | Not real AI, same output every time |

**Why Groq won:**
- **Free tier actually works** — 30 requests/minute without a credit card
- **Fast inference** — LLaMA 3 70B responds in <2 seconds. OpenAI/Gemini take 5-10 seconds
- **JSON mode** — Groq supports `response_format={"type": "json_object"}` ensuring structured output
- **No rate limit issues** — In testing, Groq handled repeated requests without quota exhaustion
- **Fallback** — If Groq fails, the app automatically falls back to mock data. No errors shown to user

**Trade-off:** LLaMA 3 quality is slightly below GPT-4 for complex planning. But for a trip planner prototype, it's more than sufficient.

**What the AI does:**
1. Receives prompt: "Plan a trip to {destination}. Budget: {budget}. Interests: {interests}. Return JSON with days, activities, coordinates..."
2. Returns JSON like:
```json
{
  "days": [
    {
      "day": 1,
      "date": "Day 1",
      "activities": [
        {"name": "Eiffel Tower", "description": "...", "cost": "$30", "lat": 48.8584, "lng": 2.2945},
        ...
      ]
    }
  ]
}
```
3. Backend parses this JSON, saves to database, returns to frontend

---

## 5. Why Leaflet + OpenStreetMap (instead of Google Maps, Mapbox)?

**The problem:** We needed to display an interactive map with markers for each activity's location, popups with activity info, and automatic zoom-to-fit.

**Alternatives considered:**
| Option | Pros | Cons |
|--------|------|------|
| Google Maps JS API | Best quality, street view | $200/month free then $2-7 per 1000 loads, requires API key |
| Mapbox | Good customization | $200/month free then tiered pricing |
| Leaflet + OpenStreetMap | Free | No satellite view by default, slightly less polished |

**Why Leaflet won:**
- **Completely free** — No API key, no billing, no usage limits. Forever
- **OpenStreetMap data** — Same streets, buildings, and geography as Google Maps (it's the same source data in many cases)
- **react-leaflet** — Official React wrapper, integrates seamlessly
- **Lightweight** — ~40KB gzipped vs Google Maps ~200KB+
- **No legal restrictions** — Google Maps requires you to display their logo, can't use without showing Google branding

**Cost comparison:**
| Service | Free tier | Prototype cost |
|---------|-----------|---------------|
| Google Maps | $200/month credit | $0 for first month, then $2+ per 1000 loads |
| Mapbox | $200/month credit | $0 for first month |
| Leaflet + OSM | Unlimited free | $0 forever |

**Trade-off:** No satellite imagery, no street view, no real-time traffic. For showing itinerary pins on a map, it's perfect.

---

## 6. Why SQLite + PostgreSQL (instead of MySQL, MongoDB, Firebase)?

**The problem:** We needed to store user accounts and trip data persistently. The database should work locally with zero setup and scale to cloud deployment.

**Alternatives considered:**
| Option | Pros | Cons |
|--------|------|------|
| MySQL | Popular, reliable | Heavy for local dev, requires installation |
| MongoDB | Flexible schema | No relations (users ↔ trips), requires installation |
| Firebase | Real-time, free tier | Vendor lock-in, complex queries, Firestore limits |
| SQLite | File-based, zero setup | Not suitable for production at scale |

**Why SQLite + PostgreSQL:**
- **SQLite for development** — No installation needed. Database is just a file (`travel_planner.db`). Works immediately after cloning the repo
- **PostgreSQL for production** — Render provides free PostgreSQL. Handles concurrent users, data persists across restarts
- **SQLAlchemy ORM** — Both databases use the same Python code. Switch by changing one line in `.env`:
  ```
  # Local:
  DATABASE_URL=sqlite:///./travel_planner.db

  # Production:
  DATABASE_URL=postgresql://user:pass@host:5432/dbname
  ```

**Trade-off:** SQLite can't handle thousands of concurrent users. PostgreSQL requires setup. SQLAlchemy abstraction layer makes the swap seamless.

---

## 7. Why Render (instead of AWS, Vercel, Netlify, Heroku)?

**The problem:** We needed to host a React frontend AND a Python backend together. Ideally free, with automatic deploys from GitHub.

**Alternatives considered:**
| Option | Pros | Cons |
|--------|------|------|
| AWS (EC2 + S3) | Full control | Complex setup, $20+/month minimum |
| Vercel | Great for frontend | Serverless functions for backend (Python support is limited) |
| Netlify | Great for frontend | Serverless functions only, no persistent Python backend |
| Heroku | Simple, supported both | Free tier was discontinued |
| Railway | Similar to Render | Smaller community, fewer regions |

**Why Render won:**
- **All-in-one** — Static sites, web services, and PostgreSQL in one dashboard
- **Free tier** — Each service gets 750 hours/month (enough for one always-on service)
- **Auto-deploy** — Every git push to GitHub triggers a deploy automatically
- **SSL** — Free HTTPS certificates for all services (`onrender.com` subdomains)
- **Monorepo support** — Root directory setting lets us deploy frontend and backend from one repo
- **PostgreSQL built-in** — One-click free database with SSL

**The cost comparison for a prototype:**
| Service | Frontend | Backend | Database | Total/month |
|---------|----------|---------|----------|------------|
| AWS | $0 (S3 free tier) | $20+ (EC2 t4g.small) | $15 (RDS) | $35+ |
| Vercel + Railway | $0 | $5 | $5 | $10 |
| Heroku | $0 (discontinued) | — | — | — |
| **Render** | **$0** | **$0** | **$0** | **$0** |

**Trade-off:** Backend goes to sleep after 15 minutes of inactivity (free tier). Wakes up on first request (takes ~30 seconds). Good for a prototype, not for production.

---

## 8. Why Unsplash (instead of Google Custom Search, Pexels, Pixabay)?

**The problem:** We needed to show real photos of travel destinations when the user clicks "View Photos" on an activity.

**Alternatives considered:**
| Option | Pros | Cons |
|--------|------|------|
| Google Custom Search | Huge image database | $5 per 1000 queries, requires Google Cloud billing |
| Pexels | Free, good quality | Smaller library, 200 requests/hour |
| Pixabay | Free, large library | Older images, API less polished |
| Mock images | Always works | Same images every time, not realistic |

**Why Unsplash won:**
- **Fine art quality** — Professional photographers. Photos look stunning
- **Free tier is generous** — 50 requests/hour, no credit card needed
- **Simple API** — Single endpoint: `search/photos?query=paris+eiffel+tower`
- **Instant registration** — Create key in 2 minutes, no approval process

**Trade-off:** Rate-limited to 50/hour. Fine for a prototype demo (user loads 6 photos per search, can do ~8 place searches per hour).

---

## 9. Why Mock Mode?

**The problem:** AI APIs can fail (quota exceeded, network errors, billing issues). The app needed to work reliably even without any external APIs.

**The solution:** A `USE_MOCK` environment variable that, when `true`, returns hardcoded sample data instead of calling any external API.

**The mock data includes:**
- A 3-day itinerary with 4 activities per day
- Realistic place names, descriptions, and costs
- Valid coordinates (lat/lng) for map display
- Works for any destination (title says "Trip to X" but data is generic)

**Benefits:**
- User can demo the entire app without any API keys
- No internet dependency for the AI
- Testing UI changes doesn't consume API quota
- If real AI fails, the app auto-falls back to mock (never shows error to user)

---

## 10. Why SHA-256 for passwords (instead of bcrypt, JWT)?

**The problem:** We needed to store user passwords securely and verify them during login.

**The choice:** SHA-256 with salt.

**Why not bcrypt?** For a prototype, bcrypt adds complexity (extra library, slower hashing). SHA-256 is adequate for a demo. In production, bcrypt would be preferred (it's designed for passwords, slower to brute-force).

**How it works:**
```python
def hash_password(password: str) -> str:
    salt = os.getenv("SECRET_KEY", "default-secret")
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()
```
- **Salt** (SECRET_KEY) prevents rainbow table attacks
- **No session/JWT tokens** — For simplicity, the user ID is returned on login and stored in localStorage. The frontend passes `?user_id=X` as a query parameter. In production, you'd use JWT tokens or session cookies.

**Trade-off:** Less secure than bcrypt. No token expiry. Fine for a prototype, not for production with real user data.
