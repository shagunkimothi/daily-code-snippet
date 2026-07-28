# 🧩 DailyCode

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/CSS-Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

**DailyCode is a developer learning companion, not a snippet repository.** It delivers one curated programming concept a day, remembers what you're actually interested in, tracks the habit itself (not just the content), and nudges you back — gently, and only if you ask it to.

🌐 **Live App:** [daily-code-snippet.vercel.app](https://daily-code-snippet.vercel.app)
⚙️ **Live API + interactive docs:** [daily-code-snippet.onrender.com/docs](https://daily-code-snippet.onrender.com/docs)
📐 **Architecture deep-dive:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the daily-rotation algorithm, the 6-theme engine, the recommendation engine's rule-based→AI upgrade path, full database ER diagram, and the reasoning behind each

> **Frontend migration note:** the frontend was rebuilt from vanilla HTML/CSS/JS into **React + Vite + Tailwind CSS** (`frontend-react/`), with the same auth flow and API contracts, then given its own visual identity through a full design-system redesign. `frontend-react/` is the only frontend built and deployed to production. The original vanilla version is archived at [`legacy/frontend/`](legacy/frontend/) for reference — see **📦 Legacy Frontend Archive** below.

---

## ✨ Features

### 📅 Daily Snippet Engine
- A new public snippet is deterministically selected every UTC day — no `random()`, no cron job, same snippet for every user
- The pick is cached per day (`daily_snippets` pin table) so every request after the first is a single indexed lookup, not a recomputation
- Random snippet mode for exploring beyond today's pick
- Reading time, category, difficulty, and author shown alongside every snippet

### 🎯 Personalized Onboarding
- A short two-step wizard right after first login: **what do you want to learn** (pick from 22 curated topics) → **how often should we remind you**
- Both steps skippable — onboarding lowers friction, it doesn't gate the product
- Preferences editable anytime from Settings

### 🔔 Reminders
- Opt-in only: no reminders, daily morning/afternoon/evening, or a weekly summary
- Timezone captured automatically from the browser at onboarding — reminders fire at *your* local time, not server time
- Backed by a single, cron-triggered, shared-secret-gated endpoint — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for why this is a Render Cron Job hitting the API rather than an in-process scheduler

### 📊 Learning Analytics
- Real reading streaks (current + longest), not just favorites — every authenticated daily-snippet view is logged once per day
- Weekly/monthly activity, category distribution, reading consistency %, average learning time, and a 2-week trend
- A separate `/analytics` page by design — the Dashboard stays "today's notebook," this is the opt-in deep-dive for people who want the numbers

### 🧭 Smart Recommendations
- Rule-based v1: scores unviewed public snippets against your selected topics and favorited tags, surfaces a "next" pick plus related suggestions and topics you haven't explored yet
- Architected so a future AI-generated version is a drop-in swap behind the same endpoint — see the "Recommendations v1 → v2" section in the architecture doc

### 🧠 AI-Powered Generation
- Generate complete snippets from a topic using **Gemini 2.0 Flash**
- AI auto-fills title, language, code, explanation, difficulty, category, and tags
- Difficulty/category values are normalized server-side to the app's exact enums regardless of how the model phrases them

### 🔍 Smart Search & Filtering
- Full-text search across title, code, and explanation
- Filter by language, difficulty, category, and tags via searchable, keyboard-accessible dropdowns
- Paginated results; public snippets visible to all, private snippets visible only to the owner

### ⭐ Favorites, Dashboard & Personal Library
- Favorite any snippet with one click; add your own via manual entry, AI generation, or bulk JSON import
- Dashboard: today's snippet as the hero, quiet supporting stats, recommended-next card, recent activity, and a GitHub-style activity heatmap

### 🔐 Authentication & Settings
- Email/password (JWT) and Google OAuth 2.0, guest mode for browsing without an account
- "Remember me" (localStorage vs. sessionStorage), in-app password change, one-time welcome email
- A single Settings page for learning preferences, reminders, theme, and account/security

### 🎨 A Real Multi-Theme System
- **6 built-in themes** — 🌙 Midnight, ☀️ Solar, 🌿 Forest, 💜 Lavender, 🌊 Ocean, 🤍 Paper — each defining its own full token set (backgrounds, cards, borders, shadows, and syntax-highlighting colors), not just a light/dark palette swap
- A visual Theme Gallery with live preview cards; switching is instant and animates smoothly across every element
- Mobile-first responsive shell: a persistent, collapsible sidebar on desktop becomes a slide-out drawer on mobile

---

## 🎨 Design System

The redesign isn't a component library bolted onto the app — every color, radius, and shadow is a CSS custom property, and every component consumes it through Tailwind (`bg-card`, `text-muted`, `border-border-card`), never a hardcoded value. That's what makes 6 themes possible without six versions of every component.

- **Tokens**: `frontend-react/src/index.css` — one `:root` block (Midnight) plus five `[data-theme="…"]` overrides, all sharing the exact same variable names
- **Components**: `frontend-react/src/components/ui/` — `Button` (variants incl. a polymorphic `as="link"`), `Card`, `Badge`, `Input`/`Textarea`, `Select` (searchable, Headless UI `Combobox`-based), `Dialog`, `Switch`, `Tabs`, `Tooltip`, `EmptyState`, `Spinner`, `StatCard`
- **Motion**: Framer Motion for micro-interactions (button press, dialog/drawer transitions, theme-selection feedback) — subtle and fast, never decorative for its own sake
- **Icons**: `lucide-react` throughout, `currentColor`-based so they re-theme for free

Full rationale — why Headless UI, why hand-built bar charts instead of a charting library, the anti-flash theme-loading script, the full 6-theme palette table — is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | FastAPI, SQLAlchemy ORM, Uvicorn |
| **AI** | Google Generative AI SDK — `gemini-2.0-flash` |
| **Auth** | JWT (`python-jose`), bcrypt (`passlib`), Google OAuth (`Authlib`) |
| **Email** | [Resend](https://resend.com) (transactional welcome/reminder emails) |
| **Scheduling** | Render Cron Job → `POST /internal/reminders/run` (shared-secret gated) |
| **Database** | PostgreSQL (hosted on Render; Docker Compose for local dev) |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, Axios, Context API |
| **UI Primitives** | Headless UI (accessible unstyled components), Framer Motion, lucide-react, Prism.js |
| **Deployment** | Backend → Render · Frontend → Vercel / GitHub Pages |

---

## 📂 Project Structure

```
daily-code-snippet/
├── backend/
│   ├── app/
│   │   ├── main.py            # All API routes, grouped by section (auth, user/prefs,
│   │   │                      #   tags, snippets, favorites, heatmap, analytics,
│   │   │                      #   recommendations, dashboard, reminders)
│   │   ├── models.py          # SQLAlchemy models — see docs/ARCHITECTURE.md for the ER diagram
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── auth.py            # JWT creation + Google OAuth registration
│   │   ├── security.py        # Password hashing (bcrypt)
│   │   ├── database.py        # SQLAlchemy engine, session, Base
│   │   ├── dependencies.py    # get_current_user dependency
│   │   ├── seed_data.py       # Idempotent starter-snippet seeding (runs on every boot if empty)
│   │   ├── topics_seed.py     # Idempotent seeding for the 22 onboarding topics
│   │   ├── email.py           # send_email() — Resend HTTP API abstraction
│   │   └── email_templates.py # Shared HTML email layout + welcome/reminder templates
│   ├── seed.py                 # CLI wrapper: `python seed.py` to seed manually
│   ├── docker-compose.yml      # Local Postgres + backend, for when the Render external URL isn't reachable
│   ├── requirements.txt
│   └── .env                    # ← Never commit this
│
├── frontend-react/             # ✅ Current frontend — React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/              # Login (serves /login + /signup), Home, Dashboard, MySnippets,
│   │   │                       #   Favorites, Profile, Settings, Onboarding, Analytics,
│   │   │                       #   AddSnippet, Calendar, Privacy, NotFound
│   │   ├── components/
│   │   │   ├── ui/             # Design-system primitives (Button, Card, Badge, Select, Dialog, ...)
│   │   │   ├── Layout/         # AppShell — responsive sidebar/drawer shell
│   │   │   ├── ThemeGallery/   # Theme picker dialog with live preview cards
│   │   │   └── ...             # Sidebar, Header, Footer, SnippetCard, SearchBar, TagChip,
│   │   │                       #   Pagination, Heatmap, Loader, Toast, Skeleton,
│   │   │                       #   ProtectedRoute, ErrorBoundary
│   │   ├── context/             # AuthContext, ThemeContext
│   │   ├── hooks/                # useAuth, useTheme, useDebounce, useFetch, useToast
│   │   ├── services/             # api.js (axios instance), authService, snippetService,
│   │   │                         #   dashboardService, userService — every fetch call lives here
│   │   ├── utils/                # prismSetup.js, langColors.js, jwt.js, tokenStorage.js, difficultyVariant.js
│   │   ├── App.jsx               # Route definitions (lazy-loaded pages)
│   │   └── main.jsx               # Providers + router entry point
│   ├── .env.development         # VITE_API_BASE_URL for local dev
│   ├── .env.production          # VITE_API_BASE_URL for the deployed backend
│   ├── .env.example
│   └── package.json
│
├── docs/
│   └── ARCHITECTURE.md          # Deep-dive: algorithms, theme engine, database ER diagram, security
│
└── legacy/frontend/              # 📦 Archived vanilla JS frontend — reference only,
                                   #    not built or deployed.
```

---

## 🗄️ Database Schema (summary)

| Table | Purpose |
| :--- | :--- |
| `users` | Auth + profile — includes `created_at`, `welcome_email_sent_at`, `onboarding_completed` |
| `snippets` | The core content — public/private, difficulty, category, computed `reading_time_minutes`/`author` |
| `tags` / `snippet_tags` | Freeform, per-snippet labels (M2M) |
| `topics` / `user_topics` | Curated onboarding taxonomy — 22 fixed topics (M2M with `users`) |
| `reminder_settings` | One row per user — frequency + IANA timezone |
| `favorites` | User ↔ snippet, drives the Favorites page |
| `daily_snippets` | Rotation pin cache — one row per UTC day |
| `activities` | Generic event log — favoriting *and* `viewed_daily_snippet` (the backbone of streaks/analytics) |

Full column-level detail and the ER diagram are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm (for `frontend-react`)
- PostgreSQL database — either the Render-hosted one via `DATABASE_URL`, or a local one via Docker (see below)
- Google Cloud project with OAuth 2.0 credentials
- Google AI Studio API key
- A [Resend](https://resend.com) API key (optional locally — email sending no-ops gracefully without it, logging instead of failing)

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

> **Windows note:** `zoneinfo` (used for timezone-aware reminders) has no built-in timezone database on Windows — `tzdata` is in `requirements.txt` specifically for this; without it, every timezone lookup silently falls back to UTC.

### 3. Configure environment variables

Create a `.env` file inside `backend/`:

```dotenv
# JWT & Security
JWT_SECRET_KEY=your_strong_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
SESSION_SECRET=your_session_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback

# Database — see "Local database options" below
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Frontend — where the Google OAuth callback redirects after login.
FRONTEND_URL=http://127.0.0.1:5500

# Email (Resend) — optional locally; omit to have emails log-and-skip instead of send
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=DailyCode <onboarding@resend.dev>

# Shared secret for POST /internal/reminders/run — never a user JWT
CRON_SECRET=some_random_string

# Set to "true" only on Render deployment
RENDER=false
```

> This file is never touched by the frontend or its build tooling — see [`frontend-react/.env.example`](frontend-react/.env.example) for the frontend's own (non-secret) environment variable.

#### Local database options

- **Render's external URL** — simplest if your network allows it (some networks interfere with non-HTTPS encrypted traffic on nonstandard ports like Postgres's 5432, which shows up as an SSL-handshake failure with no other symptom).
- **Docker Compose** — sidesteps that entirely by running Postgres locally:
  ```bash
  cd backend
  docker-compose up --build
  ```
  Add `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` to `.env` (any values — this is a throwaway local DB); `docker-compose.yml`'s `backend` service overrides `DATABASE_URL` itself to point at the container, ignoring whatever's in `.env`.

### 4. Seed the database

```bash
python seed.py
```

Populates 10 starter public snippets and the 22 onboarding topics. This also happens **automatically on every backend boot** if either table is empty — `seed.py` is for convenience/manual re-runs, not a required step.

### 5. Start the backend

```bash
uvicorn app.main:app --reload
```

API running at `http://127.0.0.1:8000` · Interactive docs at `http://127.0.0.1:8000/docs`

### 6. Start the frontend

```bash
cd frontend-react
npm install
npm run dev
```

Then visit `http://localhost:5500/login`

Vite's dev server is pinned to **port 5500** on purpose — it's the only local-dev origin in the backend's CORS allowlist (`origins` in `backend/app/main.py`), alongside `:8000` for the backend itself.

<details>
<summary>Browsing the archived legacy vanilla frontend (reference only)</summary>

```bash
cd legacy/frontend
python -m http.server 5500
```

Then visit `http://127.0.0.1:5500/auth.html`. Its `config.js` still points at the real backend, so it will actually authenticate — kept purely for comparing the original vanilla implementation against `frontend-react`, not as a supported second frontend.
</details>

---

## 🚀 Deployment

### Backend → Render
1. Connect your GitHub repo to [Render](https://render.com)
2. Create a new **Web Service**, root directory: `backend`
3. Build command: `pip install -r requirements.txt` · Start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
4. Add all `.env` variables (including `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`) in Render's **Environment** tab
5. Set `RENDER=true`
6. **For reminders to actually send**: add a Render **Cron Job** that runs hourly and calls `POST /internal/reminders/run` with header `X-Cron-Secret: <your CRON_SECRET>` — the endpoint itself works standalone, this step just wires up the schedule

### Frontend → Vercel
1. Connect repo to [Vercel](https://vercel.com), root directory `frontend-react`
2. Build command: `npm run build` · Output directory: `dist`
3. `VITE_API_BASE_URL` is already set via the committed `.env.production`
4. Deploy, then **update `FRONTEND_URL` in the backend's Render environment** to the resulting Vercel domain root

### Frontend → GitHub Pages
1. `cd frontend-react && npm run build`, publish the `dist/` folder
2. Same `FRONTEND_URL` note as above applies

> The legacy vanilla frontend is archived, not deployed.

---

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | ❌ | Register with email/password; triggers a one-time welcome email |
| `POST` | `/auth/login` | ❌ | Login, returns JWT |
| `GET` | `/auth/google/login` | ❌ | Redirect to Google OAuth |
| `GET` | `/auth/google/callback` | ❌ | Google OAuth callback; also triggers the welcome email on first login |

### User Profile & Preferences
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/me` | ✅ | Profile + onboarding status + topics + reminder settings, in one call |
| `GET` | `/topics` | ❌ | All 22 curated onboarding topics |
| `POST` | `/users/me/topics` | ✅ | Replace selected topics (set-replace, not append) |
| `GET` | `/users/me/reminders` | ✅ | Current reminder frequency + timezone |
| `POST` | `/users/me/reminders` | ✅ | Update reminder frequency + timezone |
| `POST` | `/users/me/onboarding/complete` | ✅ | Marks onboarding finished (or skipped) |
| `POST` | `/users/me/password` | ✅ | Change password (rejects Google-only accounts with a clear message) |

### Snippets
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/snippets/daily` | ❌ | Today's deterministically-rotated snippet; logs a `viewed_daily_snippet` activity if authenticated |
| `GET` | `/snippets/random` | ❌ | Random public snippet |
| `GET` | `/snippets/search` | ❌ | Search & filter (auth optional — includes your private snippets if logged in) |
| `GET` | `/snippets/mine` | ✅ | Current user's own snippets |
| `GET` | `/snippets/public` | ❌ | Public snippets only (guest-facing list) |
| `GET` | `/snippets/private` | ✅ | Public snippets + your own private ones |
| `POST` | `/snippets/add` | ✅ | Add a new snippet |
| `GET` | `/snippets/{id}` | ❌ | Fetch one public snippet by id (used by recommendation click-through) |
| `PATCH` | `/snippets/{id}/visibility` | ✅ | Toggle public/private — owner only (403 otherwise) |
| `DELETE` | `/snippets/{id}` | ✅ | Delete a snippet — owner only (403 otherwise) |
| `POST` | `/snippets/generate-ai` | ✅ | Generate a snippet with Gemini AI |

### Tags & Favorites
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/tags` | ❌ | All available tags |
| `POST` | `/tags` | ✅ | Create a new tag |
| `GET` | `/favorites/me` | ✅ | Current user's favorited snippets |
| `POST` | `/favorites/{id}` | ✅ | Favorite a snippet |
| `DELETE` | `/favorites/{id}` | ✅ | Remove a favorite |

### Insights
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/heatmap/me` | ✅ | 365-day activity heatmap (streaks + daily counts) |
| `GET` | `/analytics/me` | ✅ | Full learning analytics — streaks, weekly/monthly activity, category distribution, consistency %, trend |
| `GET` | `/recommendations/me` | ✅ | Rule-based next-snippet recommendation + related suggestions + unexplored topics |
| `GET` | `/dashboard/me` | ✅ | Dashboard stats (own snippets, favorites, this-week count) |

### Internal
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/internal/reminders/run` | 🔒 `X-Cron-Secret` header (not a user JWT) | Cron-triggered reminder fan-out |

---

## 🌱 How the Daily Snippet Works

No scheduling or cron jobs required for the rotation itself. Every calendar day (UTC), the backend deterministically picks a snippet and pins it:

```python
day_index = date.today().toordinal()   # UTC
offset = day_index % total_public_snippets
snippet = public_snippets_ordered_by_id[offset]
```

- The pick is written to a `daily_snippets` table keyed by date — every request after the first for that day is a single indexed lookup, not a recomputation, so this scales to thousands of snippets without extra load
- New public snippets always land at the end of the ordering (higher id), joining the rotation without disturbing anyone else's slot
- Deleted/unpublished snippets simply drop out of the pool — the rotation closes around the gap on its own
- No `random()` anywhere — same (day, snippet set) always yields the same pick, which is exactly what makes caching it safe

Full algorithm reasoning and the composite index behind it are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🧭 Recommendations: Rule-Based Today, AI-Ready Tomorrow

`GET /recommendations/me` scores unviewed public snippets live, on request — no precomputed table, no staleness:

- **+2** if the snippet's language/category/tags match a topic you selected at onboarding (via direct match or a small curated alias map for topics like "DSA" that don't literally equal a snippet field)
- **+1** if it shares a tag with something you've favorited
- Already-viewed snippets and today's rotation pick are excluded

This is deliberately swappable: once recommendations move to an LLM call (too slow/costly to run per page load), a `recommendations` table gets populated by a nightly batch job — same Render Cron mechanism as reminders — and the endpoint starts reading from that table instead of computing live. **The response shape doesn't change**, so the frontend built against v1 keeps working untouched when v2 ships.

---

## 📬 Email & Reminders

- Sent via [Resend](https://resend.com)'s HTTP API through a single `send_email()` abstraction (`backend/app/email.py`) — swapping providers later is a one-file change
- Shared HTML layout (`backend/app/email_templates.py`) with brand header/footer; welcome and reminder templates both inherit it
- All user-generated content (snippet titles/explanations) is HTML-escaped before going into email templates — unlike JSX, an f-string doesn't auto-escape, so this matters
- Reminders are opt-in only, editable anytime in Settings, and every email links back there

---

## 📦 Legacy Frontend Archive

`frontend-react/` is the active, production frontend — the only one built, deployed, and developed against going forward.

The original vanilla HTML/CSS/JS frontend that preceded the React migration lives at [`legacy/frontend/`](legacy/frontend/), preserved exactly as it was (no refactors or fixes applied). It is:

- **Not used in production** — Vercel's root directory is `frontend-react`; nothing in `legacy/` is built or served live
- **Kept for educational/reference purposes** — useful for comparing how a feature was implemented in plain JS versus its React port
- Still runnable standalone locally (see **Local Setup** above), since its `config.js` points at the same backend

---

## 📚 Further Reading

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) covers, in depth: the daily-rotation algorithm and its scalability properties, the full 6-theme token system, the database ER diagram, the reminder-scheduling architecture (and why Render Cron over an in-process scheduler), the recommendation engine's v1→v2 upgrade path, and the security/performance decisions made along the way.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
