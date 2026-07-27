# 🧩 Daily Code Snippet

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/CSS-Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

**Daily Code Snippet** is a full-stack developer productivity app that delivers a new curated code snippet every day. Users can discover, generate with AI, favorite, and organize snippets — with secure authentication via JWT or Google OAuth.

🌐 **Live Demo:** [daily-code-snippet.vercel.app](https://daily-code-snippet.vercel.app)  
⚙️ **API Docs:** [daily-code-snippet.onrender.com/docs](https://daily-code-snippet.onrender.com/docs)

> **Frontend migration note:** the frontend was rebuilt from vanilla HTML/CSS/JS into **React + Vite + Tailwind CSS** (`frontend-react/`), with the exact same UI, API contracts, and auth flow. The original vanilla frontend (`frontend/`) is kept in the repo during the transition but is no longer the one being developed against — see **Project Structure** and **Deployment** below.

---

## ✨ Features

### 📅 Daily Snippet Engine
- A new public snippet is automatically selected every day using a date-based rotation algorithm — no cron job needed
- Countdown timer shows time until the next snippet
- Random snippet mode for exploring beyond today's pick

### 🧠 AI-Powered Generation
- Generate complete snippets from a topic using **Gemini 2.0 Flash**
- AI auto-fills title, language, code, explanation, difficulty, category, and tags
- Difficulty/category values are normalized server-side to the app's exact enums (`beginner`/`intermediate`/`advanced`, fixed category list) regardless of how the model phrases them
- One-click insert into your personal library

### 🔍 Smart Search & Filtering
- Full-text search across title, code, and explanation
- Filter by language, difficulty level, category, and tags
- Paginated results (12 per page)
- Public snippets visible to all; private snippets visible only to the owner

### ⭐ Favorites & Dashboard
- Favorite any snippet with one click
- Personal dashboard with total snippets, favorites count, language breakdown, and recent activity
- GitHub-style activity heatmap (streak tracking)

### 🔐 Authentication
- Email/password signup and login with **JWT**
- **Google OAuth 2.0** — one-click sign in
- Guest mode — browse public snippets without an account
- Persistent sessions via localStorage

### 🎨 UI & UX
- Dark / Light theme toggle with persistent preference (Context API)
- Syntax highlighting via **Prism.js**, with grammars bundled for every language the app supports (not just HTML/CSS/JS)
- Sidebar navigation with role-aware visibility (guest vs. logged-in)
- Tag chips for quick filtering
- Route-level code splitting, loading skeletons, and a centralized error boundary

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | FastAPI, SQLAlchemy ORM, Uvicorn |
| **AI** | Google Generative AI SDK — `gemini-2.0-flash` |
| **Auth** | JWT (`python-jose`), bcrypt (`passlib`), Google OAuth (`authlib`) |
| **Database** | PostgreSQL (hosted on Render) |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, Axios, Context API, Prism.js |
| **Deployment** | Backend → Render · Frontend → Vercel / GitHub Pages |

---

## 📂 Project Structure

```
daily-code-snippet/
├── backend/
│   ├── app/
│   │   ├── main.py          # All API routes (auth, snippets, tags, favorites, dashboard, heatmap)
│   │   ├── models.py        # SQLAlchemy models: User, Snippet, Tag, Favorite, Activity
│   │   ├── schemas.py       # Pydantic schemas for request/response validation
│   │   ├── auth.py          # JWT creation + Google OAuth registration
│   │   ├── security.py      # Password hashing (bcrypt)
│   │   ├── database.py      # SQLAlchemy engine, session, Base
│   │   └── dependencies.py  # get_current_user dependency
│   ├── seed.py              # Populates DB with 10 starter public snippets
│   ├── requirements.txt
│   └── .env                 # ← Never commit this
│
├── frontend-react/          # ✅ Current frontend — React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/           # Login, Home, Dashboard, MySnippets, Favorites,
│   │   │                    #   AddSnippet, Calendar, Privacy, NotFound
│   │   ├── components/      # Sidebar, Header, Footer, SnippetCard, SearchBar,
│   │   │                    #   TagChip, Pagination, Heatmap, Loader, Toast,
│   │   │                    #   Skeleton, ProtectedRoute, ErrorBoundary
│   │   ├── context/         # AuthContext, ThemeContext
│   │   ├── hooks/           # useAuth, useTheme, useDebounce, useFetch, useToast
│   │   ├── services/        # api.js (axios instance), authService, snippetService,
│   │   │                    #   dashboardService — every fetch call lives here
│   │   ├── utils/           # prismSetup.js, langColors.js
│   │   ├── App.jsx          # Route definitions (lazy-loaded pages)
│   │   └── main.jsx         # Providers + router entry point
│   ├── .env.development     # VITE_API_BASE_URL for local dev
│   ├── .env.production      # VITE_API_BASE_URL for the deployed backend
│   ├── .env.example
│   └── package.json
│
└── frontend/                # ⚠️ Legacy vanilla JS frontend — kept during the
                              #    transition, not actively developed against.
                              #    Same layout as before (index.html, auth.html,
                              #    dashboard.html, script.js, auth.js, style.css, ...).
```

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm (for `frontend-react`)
- PostgreSQL database (or use the Render hosted one via `DATABASE_URL`)
- Google Cloud project with OAuth 2.0 credentials
- Google AI Studio API key

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/daily-code-snippet.git
cd daily-code-snippet
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file inside `backend/`:

```dotenv
# JWT
JWT_SECRET_KEY=your_strong_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
SESSION_SECRET=your_session_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback

# Database
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Frontend — where the Google OAuth callback redirects after login.
# frontend-react's dev server runs on port 5500 with no subpath (unlike the
# legacy vanilla frontend, which was served from /frontend). If you're
# running the legacy frontend instead, use http://127.0.0.1:5500/frontend.
FRONTEND_URL=http://127.0.0.1:5500

# Set to "true" only on Render deployment
RENDER=false
```

> This file is never touched by the frontend or its build tooling — see [`frontend-react/.env.example`](frontend-react/.env.example) for the frontend's own (non-secret) environment variable.

### 4. Seed the database

```bash
python seed.py
```

This adds 10 starter public snippets so the daily snippet works immediately.

### 5. Start the backend

```bash
uvicorn app.main:app --reload
```

API is now running at `http://127.0.0.1:8000`  
Interactive docs at `http://127.0.0.1:8000/docs`

### 6. Start the frontend

```bash
cd frontend-react
npm install
npm run dev
```

Then visit `http://localhost:5500/auth.html`

Vite's dev server is pinned to **port 5500** on purpose — it's the only local-dev origin in the backend's CORS allowlist (`origins` in `backend/app/main.py`), alongside `:8000` for the backend itself. Running on a different port (e.g. Vite's own default, 5173) will make every API call fail with a CORS error in the browser even though it works fine in curl/Postman.

`frontend-react` reads its API base URL from `VITE_API_BASE_URL`, set in `.env.development` (already committed, points at `http://127.0.0.1:8000`) — no manual configuration needed. See `.env.example` if you need to override it locally (copy to `.env.local`, which is gitignored).

<details>
<summary>Running the legacy vanilla frontend instead</summary>

```bash
cd frontend
python -m http.server 5500
```

Then visit `http://127.0.0.1:5500/frontend/auth.html`. Remember `FRONTEND_URL` in `backend/.env` needs the `/frontend` suffix for this version's OAuth callback to land correctly (see step 3 above).
</details>

---

## 🚀 Deployment

### Backend → Render
1. Connect your GitHub repo to [Render](https://render.com)
2. Create a new **Web Service**, root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
5. Add all `.env` variables in Render's **Environment** tab
6. Set `RENDER=true` in Render environment variables

### Frontend → Vercel
1. Connect repo to [Vercel](https://vercel.com)
2. Set root directory to **`frontend-react`**
3. Build command: `npm run build` · Output directory: `dist`
4. `VITE_API_BASE_URL` is already set via the committed `.env.production` (points at the Render backend) — only add it in Vercel's **Environment Variables** tab if you want to override that
5. Deploy
6. **Update `FRONTEND_URL` in the backend's Render environment** to the resulting Vercel domain root (no `/frontend` suffix — `frontend-react` serves from the project root, unlike the legacy vanilla site), so the Google OAuth callback lands on the right page

### Frontend → GitHub Pages
1. `cd frontend-react && npm run build`, then publish the `dist/` folder (e.g. via a `gh-pages` branch or a deploy action) — GitHub Pages doesn't run a build step itself
2. Same `FRONTEND_URL` note as above applies

<details>
<summary>Deploying the legacy vanilla frontend instead</summary>

1. Vercel: root directory `frontend`, no build command (static site)
2. GitHub Pages: **Settings → Pages**, source `main` branch, folder `/frontend` — live at `https://yourusername.github.io/daily-code-snippet/frontend/`
3. `FRONTEND_URL` needs the `/frontend` suffix for this version
</details>

---

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | ❌ | Register with email/password |
| `POST` | `/auth/login` | ❌ | Login, returns JWT |
| `GET` | `/auth/google/login` | ❌ | Redirect to Google OAuth |
| `GET` | `/auth/google/callback` | ❌ | Google OAuth callback |
| `GET` | `/snippets/daily` | ❌ | Today's auto-selected snippet |
| `GET` | `/snippets/random` | ❌ | Random public snippet |
| `GET` | `/snippets/search` | ❌ | Search & filter snippets (auth optional — includes your private ones if logged in) |
| `GET` | `/snippets/mine` | ✅ | Current user's own snippets |
| `GET` | `/snippets/public` | ❌ | Public snippets only (guest-facing list) |
| `GET` | `/snippets/private` | ✅ | Public snippets + your own private ones |
| `POST` | `/snippets/add` | ✅ | Add a new snippet |
| `PATCH` | `/snippets/{id}/visibility` | ✅ | Toggle public/private — owner only (403 otherwise) |
| `DELETE` | `/snippets/{id}` | ✅ | Delete a snippet — owner only (403 otherwise) |
| `POST` | `/snippets/generate-ai` | ✅ | Generate snippet with Gemini AI (difficulty/category normalized to the app's enums) |
| `GET` | `/tags` | ❌ | All available tags |
| `POST` | `/tags` | ✅ | Create a new tag |
| `GET` | `/favorites/me` | ✅ | Current user's favorited snippets |
| `POST` | `/favorites/{id}` | ✅ | Favorite a snippet |
| `DELETE` | `/favorites/{id}` | ✅ | Remove a favorite |
| `GET` | `/heatmap/me` | ✅ | 365-day activity heatmap (streaks + daily counts) |
| `GET` | `/dashboard/me` | ✅ | User dashboard stats |

---

## 🌱 How the Daily Snippet Works

No scheduling or cron jobs required. The backend picks today's snippet using:

```python
day_index = date.today().toordinal()
return snippets[day_index % cycle % total]
```

- Every calendar date maps to a deterministic snippet
- Automatically advances at midnight
- New public snippets join the rotation immediately when added

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.