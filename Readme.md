# 🧩 Daily Code Snippet

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![JavaScript](https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

**Daily Code Snippet** is a full-stack developer productivity app that delivers a new curated code snippet every day. Users can discover, generate with AI, favorite, and organize snippets — with secure authentication via JWT or Google OAuth.

🌐 **Live Demo:** [daily-code-snippet.vercel.app](https://daily-code-snippet.vercel.app)  
⚙️ **API Docs:** [daily-code-snippet.onrender.com/docs](https://daily-code-snippet.onrender.com/docs)

---

## ✨ Features

### 📅 Daily Snippet Engine
- A new public snippet is automatically selected every day using a date-based rotation algorithm — no cron job needed
- Countdown timer shows time until the next snippet
- Random snippet mode for exploring beyond today's pick

### 🧠 AI-Powered Generation
- Generate complete snippets from a topic using **Gemini 2.0 Flash**
- AI auto-fills title, language, code, explanation, difficulty, category, and tags
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
- Dark / Light theme toggle with persistent preference
- Syntax highlighting via **Prism.js**
- Fully responsive layout with sidebar navigation
- Tag chips for quick filtering

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | FastAPI, SQLAlchemy ORM, Uvicorn |
| **AI** | Google Generative AI SDK — `gemini-2.0-flash` |
| **Auth** | JWT (`python-jose`), bcrypt (`passlib`), Google OAuth (`authlib`) |
| **Database** | PostgreSQL (hosted on Render) |
| **Frontend** | Vanilla JavaScript (ES Modules), CSS Variables, Prism.js |
| **Deployment** | Backend → Render · Frontend → Vercel / GitHub Pages |

---

## 📂 Project Structure

```
daily-code-snippet/
├── backend/
│   ├── app/
│   │   ├── main.py          # All API routes (auth, snippets, tags, dashboard)
│   │   ├── models.py        # SQLAlchemy models: User, Snippet, Tag, Favorite, Activity
│   │   ├── schemas.py       # Pydantic schemas for request/response validation
│   │   ├── auth.py          # JWT creation + Google OAuth registration
│   │   ├── security.py      # Password hashing (bcrypt)
│   │   ├── database.py      # SQLAlchemy engine, session, Base
│   │   └── dependencies.py  # get_current_user dependency
│   ├── seed.py              # Populates DB with 10 starter public snippets
│   ├── requirements.txt
│   └── .env                 # ← Never commit this
└── frontend/
    ├── index.html           # Main app shell (daily snippet + search + gallery)
    ├── auth.html            # Login, signup, Google OAuth, guest mode
    ├── dashboard.html       # User stats, heatmap, favorites
    ├── script.js            # Core logic: daily snippet, search, filters, pagination
    ├── auth.js              # Login, signup, Google OAuth handler, token storage
    ├── Sidebar.js           # Sidebar navigation and view switching
    ├── config.js            # Dynamic API base URL (local vs production)
    └── style.css            # Full custom CSS with dark/light theme variables
```

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.11+
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

# Frontend
FRONTEND_URL=http://127.0.0.1:5500/frontend

# Set to "true" only on Render deployment
RENDER=false
```

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

Open `frontend/index.html` with VS Code Live Server, or:

```bash
cd frontend
python -m http.server 5500
```

Then visit `http://127.0.0.1:5500/frontend/auth.html`

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
2. Set root directory to `frontend`
3. No build command needed (static site)
4. Deploy

### Frontend → GitHub Pages
1. Go to repo **Settings → Pages**
2. Source: `main` branch, folder: `/frontend`
3. Your site will be live at `https://yourusername.github.io/daily-code-snippet/frontend/`

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
| `GET` | `/snippets/search` | ❌ | Search & filter snippets |
| `GET` | `/snippets/mine` | ✅ | Current user's snippets |
| `POST` | `/snippets/add` | ✅ | Add a new snippet |
| `POST` | `/snippets/generate-ai` | ✅ | Generate snippet with Gemini AI |
| `GET` | `/tags` | ❌ | All available tags |
| `POST` | `/tags` | ✅ | Create a new tag |
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