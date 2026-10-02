# Daily Code — AI-Driven Developer Learning Platform

> A personalized developer learning platform for discovering, organizing, searching, and learning from code snippets, enhanced with semantic search and Retrieval-Augmented Generation (RAG).

## Screenshots

The repository's screenshot assets are stored in `assests/` (the existing directory name).

### Daily learning

![Daily Code home](assests/daily-code-home.png)

### Ask Library with RAG sources

![Ask Library RAG answer and sources](assests/ask-library-rag.png)

### Dashboard and learning activity

![Daily Code dashboard](assests/dashboard.png)

### Bulk snippet import

![Bulk import interface](assests/bulk-import.png)

### Analytics

![Learning analytics](assests/analytics.png)

## What is Daily Code?

Daily Code is a developer learning platform, not only a place to store code. It combines a curated daily programming snippet with tools for building a personal code library, searching snippets, and tracking learning activity.

Visitors can browse public content, while signed-in users can manage their own snippets, save favorites, personalize learning, and ask questions grounded in snippets they are authorized to access. Semantic retrieval and RAG add to the original daily-learning and library flows rather than replacing them.

## Key features

### Daily learning

- A public snippet is selected deterministically for each UTC day and pinned in the `daily_snippets` table, so visitors see the same daily selection.
- The first request of a day calculates and stores the selection; later requests use the saved pin.
- Browse a random public snippet when you want to explore beyond the daily pick.
- Browse and filter snippets by language, difficulty, and tags.
- Snippet cards include explanations and metadata such as category, difficulty, author, and estimated reading time; the home view supports copying the daily snippet's code.

### Personal library

- Browse public snippets as a guest.
- Create snippets manually, generate a draft with AI, and manage your own snippets.
- Set a snippet's visibility to public or private. Owners can view and manage their own snippets; private snippets are not exposed to other users.
- Add tags, mark snippets as favorites, and browse your favorites and personal library.
- Bulk import JSON, CSV, or TXT through the existing Add Snippet experience.

### Search

- Keyword search over snippet titles, code, and explanations, with language, difficulty, category, tag, and visibility filters.
- Semantic search powered by `BAAI/bge-small-en-v1.5` embeddings and PostgreSQL/pgvector.
- Semantic results include similarity scores. Search by a concept even when the query does not use the snippet's exact terms.

### RAG / Ask Library

- Ask questions about the signed-in user's Daily Code library.
- Retrieve relevant public snippets and the current user's own private snippets.
- Generate an answer with Gemini using retrieved snippets as structured context.
- Display source snippets and similarity scores with the answer; when retrieval finds no context, return an explicit no-context response.

### AI snippet generation

Generate a snippet draft from a requested topic and language. This is separate from RAG: the generation endpoint does not retrieve library snippets as grounding context.

### Learning and personalization

- A skippable onboarding flow for selecting learning interests and reminder preferences.
- A curated set of 22 learning topics; preferences can be changed later.
- Optional reminder settings: none, daily morning, afternoon, or evening, or a weekly summary. The browser's IANA timezone is saved with the preference. Email delivery uses the optional Resend integration and an external scheduler calling a protected backend endpoint; without those configured, reminders are not sent. The current weekly-summary setting reuses the daily-snippet reminder content.
- A dashboard with the daily snippet, recommendations, recent activity, and activity heatmap.
- Learning analytics including current and longest streaks, active days, viewed snippets, category distribution, reading consistency, average learning time, and recent activity trends.
- Rule-based recommendations use selected topics, viewed snippets, and favorited tags.

### Authentication, themes, and interface

- Email/password authentication using JWT access tokens and Google OAuth.
- A remember-me choice stores authentication in local storage or session storage; users can change their password from Settings.
- Guest browsing for public content.
- A responsive React interface with six themes: Midnight, Solar, Forest, Lavender, Ocean, and Paper.
- The selected theme is saved in browser local storage. New users and guests without a saved preference start with Paper; returning users retain their saved theme.
- The theme is applied before the first page paint where possible to reduce theme flicker.

## Application flow: the original snippet and learning experience

The original app flow remains the foundation of Daily Code. React screens call the shared API/service layer; FastAPI handles validation, authentication, visibility, and application logic; SQLAlchemy reads and writes PostgreSQL. The RAG feature is an additional path described below.

```mermaid
flowchart LR
    Person[Guest or signed-in learner] --> React[React pages and components]
    React --> State[Auth and theme contexts]
    React --> Services[Axios API services]
    Services --> API[FastAPI routes]
    API --> Auth[JWT or Google OAuth]
    API --> Rules[Validation, access rules, learning logic]
    Rules --> DB[(PostgreSQL)]
    DB --> Rules
    Rules --> Services
    Services --> React
```

In everyday use, the frontend requests the daily or public snippets, searches or filters them, and renders results using the shared snippet UI. Authentication-aware routes and the backend decide which personal actions are available. Signed-in reading and favorite activity feed the dashboard, heatmap, analytics, and rule-based recommendations.

AI snippet generation is a separate flow: an authenticated user supplies a topic and language, FastAPI asks Gemini for a structured draft containing title, language, code, explanation, difficulty, category, and tags, and the backend normalizes difficulty and category to the application's allowed values. It does not retrieve library snippets as grounding context.

### Daily selection, learning, and recommendation flow

```mermaid
flowchart TD
    Open[Open Daily Code] --> Daily[GET /snippets/daily]
    Daily --> Pin{Today's UTC selection pinned?}
    Pin -- Yes --> Return[Return pinned public snippet]
    Pin -- No --> Select[Deterministically select from public snippets]
    Select --> Save[Save daily_snippets pin]
    Save --> Return
    Return --> Read[User reads snippet]
    Read --> Activity[Record one daily-view activity for signed-in user]
    Activity --> Learn[Dashboard, heatmap, analytics]
    Learn --> Recommend[Rule-based recommendations from interests and favorites]
```

### Frontend design system

The current frontend is the React/Vite application in `frontend-react/`; the earlier vanilla frontend is archived under `legacy/frontend/` and is not the active application. The current UI uses Tailwind CSS and shared CSS theme tokens, reusable UI primitives (buttons, cards, badges, inputs, selects, dialogs, switches, tabs, tooltips, empty states, spinners, and stat cards), Headless UI controls, Framer Motion, Lucide icons, and Prism.js for code highlighting. Routes are lazy-loaded and use shared auth/theme contexts and API services. On desktop the app uses a collapsible sidebar; on smaller screens it becomes a drawer.

The theme catalog and persisted preference live in the existing theme context. The HTML entry point applies the saved or default theme before React renders to help avoid a flash of the wrong theme.

## Semantic search and RAG

### In simple terms

Semantic search finds code by meaning, not just by matching the exact words typed. RAG (retrieval-augmented generation) takes that a step further: Daily Code finds relevant snippets the user is allowed to access, sends those snippets as context to Gemini, then returns an answer with source snippets. Gemini is not given the user's entire database or another user's private content.

### Technical RAG pipeline

```mermaid
flowchart TD
    Query[Question entered in React] --> Route[POST /snippets/rag]
    Route --> Auth[Authenticate user]
    Auth --> Embed[Embed question with BAAI/bge-small-en-v1.5]
    Embed --> Search[Cosine similarity search in pgvector]
    Search --> Filter[Restrict to public snippets and this user's private snippets]
    Filter --> TopK[Rank and select authorized top-k matches]
    TopK --> Context[Build structured context: title, language, explanation, code]
    Context --> Gemini[Generate answer with Gemini]
    Gemini --> Response[Return answer, grounded flag, source snippets and scores]
    Response --> UI[Display answer and retrieved sources in React]
```

### How embeddings and semantic retrieval work

1. The backend creates snippet text from useful fields such as title, language, category, difficulty, explanation, and code.
2. `sentence-transformers` with `BAAI/bge-small-en-v1.5` generates normalized 384-dimensional vectors. The backend attempts to create an embedding when a snippet is added; the backfill command can process existing snippets.
3. PostgreSQL stores vectors in `snippet_embeddings` using pgvector. An HNSW index uses cosine vector operations.
4. For semantic search, the backend embeds the query, filters results to public snippets and (when authenticated) the current user's own private snippets, ranks by cosine similarity, and returns the top-k snippets with similarity scores.

Semantic search is exposed at `GET /snippets/semantic-search`. It can be used by guests for public snippets; authenticated users can also retrieve their own private snippets.

### How grounded generation works

`POST /snippets/rag` requires authentication. It retrieves authorized matches using the same semantic retrieval rules, then serializes only those matches into structured context for Gemini. The context includes relevant snippet fields, not embedding vectors. Gemini is instructed to treat snippet contents as untrusted reference data and answer from the supplied Daily Code context.

If no relevant matches are retrieved, the endpoint does not ask Gemini to invent a source. It returns an explicit no-context response with `grounded: false` and an empty source list. When context is available, the answer and retrieved source snippets (including similarity scores) are returned to React.

The backend also exposes `POST /snippets/generate-rag` as a compatibility alias for the same RAG flow. AI snippet generation at `POST /snippets/generate-ai` is a separate feature and does not use RAG retrieval.

### Privacy and security

- Backend retrieval enforces snippet visibility before matches are returned or RAG context is built.
- Guests can search public snippets; authenticated users can search public snippets and their own private snippets.
- A user's private snippets are excluded from another user's results.
- Gemini receives only the authorized top-k snippets selected for that request. The full database and vector values are not sent.
- RAG requests require an authenticated user.
- JWT signing keys, OAuth credentials, Gemini keys, and email-provider keys are backend configuration and should never be placed in frontend code or committed to Git.

### Semantic search vs. RAG

| Flow | What it does |
| --- | --- |
| Semantic search | Query → BGE embedding → authorized vector similarity retrieval → relevant snippets and scores |
| RAG | Query → BGE embedding → authorized vector retrieval → structured context → Gemini → answer with retrieved sources |

Semantic search returns matching snippets; it does not generate an answer. RAG reuses the retrieval step and supplies only those authorized matches to Gemini to generate a context-aware response.

### Manual implementation

The retrieval and generation steps are implemented directly in the backend rather than through LangChain. This keeps embedding generation, PostgreSQL retrieval, authorization, context construction, no-context handling, and Gemini calls explicit in the application.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Context API |
| Backend | Python 3.11, FastAPI, Pydantic, SQLAlchemy, Uvicorn |
| Database | PostgreSQL, pgvector, Alembic |
| AI/ML | Sentence Transformers, `BAAI/bge-small-en-v1.5` (384 dimensions), Google GenAI SDK, Gemini |
| Authentication | JWT (`python-jose`), password hashing (`passlib`/`bcrypt`), Authlib, Google OAuth |
| Infrastructure / dev tools | Docker, Docker Compose, npm |

Retrieval and context construction are implemented directly in the backend; the project does not use LangChain.

## Project structure

```text
daily-code-snippet/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI routes and application flows
│   │   ├── models.py               # SQLAlchemy and pgvector models
│   │   ├── schemas.py              # Request and response schemas
│   │   ├── auth.py                 # JWT and Google OAuth configuration
│   │   ├── security.py             # Password hashing helpers
│   │   ├── database.py             # SQLAlchemy engine and sessions
│   │   ├── dependencies.py         # Shared request dependencies
│   │   ├── embedding_service.py    # BGE embedding model
│   │   ├── rag_service.py          # Authorized semantic retrieval and RAG context
│   │   ├── seed_data.py            # Idempotent starter-snippet seeding
│   │   ├── topics_seed.py          # Curated onboarding topics
│   │   └── email.py                # Optional Resend email adapter
│   ├── alembic/
│   │   └── versions/               # Database migrations, including pgvector storage
│   ├── alembic.ini
│   ├── docker-compose.yml          # Local PostgreSQL and backend services
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── seed.py                     # Optional seed command
│   └── test_phase4_retrieval.py    # Manual semantic-retrieval integration script
├── assests/                        # Existing product screenshot assets
├── docs/
│   └── ARCHITECTURE.md              # Additional design and architecture notes
├── legacy/
│   └── frontend/                    # Archived vanilla frontend; not the active app
├── frontend-react/
│   ├── src/
│   │   ├── components/             # Shared layout, snippet, and UI components
│   │   ├── context/                # Authentication and theme state
│   │   ├── hooks/
│   │   ├── pages/                   # Home, Dashboard, Analytics, AddSnippet, etc.
│   │   ├── services/                # API, auth, snippet, dashboard, user clients
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.jsx                  # Routes
│   │   └── main.jsx                 # React entry point
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── LICENSE
└── README.md
```

## Database overview

| Table | Purpose |
| --- | --- |
| `users` | Account identity, password/OAuth identifiers, onboarding state, and signup metadata |
| `snippets` | Code snippets, visibility, ownership, language, category, difficulty, and explanation |
| `tags`, `snippet_tags` | Reusable snippet tags and the many-to-many association |
| `topics`, `user_topics` | Curated learning interests selected by users |
| `reminder_settings` | Per-user reminder frequency and timezone |
| `favorites` | User-to-snippet favorites |
| `activities` | Learning and favorite activity used by the heatmap and analytics |
| `daily_snippets` | One pinned public snippet per UTC date |
| `snippet_embeddings` | Snippet text chunks, model identifiers, and 384-dimensional pgvector embeddings |

The full SQLAlchemy models and migration are in `backend/app/models.py` and `backend/alembic/versions/`.

## Database and vector setup

The embedding migration creates the pgvector extension, `snippet_embeddings` table, and an HNSW index using cosine distance. The stored `VECTOR(384)` values are generated with `BAAI/bge-small-en-v1.5`. A PostgreSQL installation must have pgvector available; `CREATE EXTENSION vector` must succeed before the database can use semantic search and RAG.

With the backend virtual environment active and the current directory set to `backend`, apply the migration:

```powershell
python -m alembic upgrade head
```

New snippets are embedded by the existing add-snippet flow. To add or refresh embeddings for existing snippets, run the backfill command from `backend`:

```powershell
python -m app.main backfill-embeddings
```

The first embedding operation may download the Sentence Transformers model. Embedding errors during snippet creation are logged; the snippet remains saved and can be retried by running the backfill.

## Local setup

### Prerequisites

- Git.
- Python 3.11.
- PostgreSQL with pgvector installed and enabled.
- Node.js and npm.
- Google OAuth credentials (required by the backend auth configuration).
- A Gemini API key for Gemini-backed generation.
- Docker Desktop with Docker Compose is optional for the native setup and required only for the Compose option below.

The first embedding operation may download the Sentence Transformers model.

### 1. Get the source

```powershell
git clone https://github.com/shagunkimothi/daily-code-snippet.git
Set-Location daily-code-snippet
```

### 2. Configure the backend

Create `backend/.env` (do not commit it) with the local PostgreSQL and backend settings:

```dotenv
POSTGRES_USER=dailycode
POSTGRES_PASSWORD=replace-with-a-local-password
POSTGRES_DB=dailycode

JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
SESSION_SECRET=replace-with-a-random-session-secret
CRON_SECRET=replace-with-a-random-cron-secret

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback
FRONTEND_URL=http://127.0.0.1:5500

GEMINI_API_KEY=your-gemini-api-key

# Optional: email reminders and welcome email delivery
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=DailyCode <onboarding@resend.dev>
```

`JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` are required by the backend at startup. `GEMINI_API_KEY` enables Gemini generation and RAG. `RESEND_API_KEY` is optional; without it, email sending is skipped. `SESSION_SECRET` has a development fallback, but configure a private value for a deployed environment.

Docker Compose uses `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` to initialize PostgreSQL and constructs the backend `DATABASE_URL` using the internal `db` service hostname. If running the backend outside Compose, provide a reachable PostgreSQL `DATABASE_URL` yourself.

### 3. Start PostgreSQL and the backend (choose one)

The repository's Compose configuration uses a pgvector-enabled PostgreSQL image and is the simplest way to get a compatible local database. To run the backend without Docker, install PostgreSQL and a pgvector build compatible with that PostgreSQL version; the migration creates the extension and embedding table, but the installation must include pgvector and the database role must be allowed to create the extension.

#### Option A: Run without Docker

Install PostgreSQL and a pgvector build compatible with that PostgreSQL version, then start the local PostgreSQL service. Create a database and user (for example, using `psql` as a PostgreSQL administrator):

```sql
CREATE ROLE dailycode WITH LOGIN PASSWORD 'replace-with-a-local-password';
CREATE DATABASE dailycode OWNER dailycode;
```

Check that pgvector is available in the target database:

```sql
\connect dailycode
CREATE EXTENSION IF NOT EXISTS vector;
```

If `CREATE EXTENSION` reports that the `vector` extension is unavailable, install the matching pgvector extension for your PostgreSQL installation before continuing. Alternatively, set `DATABASE_URL` to a reachable PostgreSQL instance where pgvector is installed.

From the repository root in PowerShell, create a Python environment, install the backend requirements, and configure `backend/.env`:

```powershell
Set-Location backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

In `backend/.env`, use your local database URL and the required auth/AI settings:

```dotenv
DATABASE_URL=postgresql://dailycode:replace-with-a-local-password@127.0.0.1:5432/dailycode
JWT_SECRET_KEY=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback
FRONTEND_URL=http://127.0.0.1:5500
GEMINI_API_KEY=your-gemini-api-key
SESSION_SECRET=replace-with-a-random-session-secret
```

Apply the embedding migration and run the backend from the `backend` directory with the virtual environment active:

```powershell
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The first migration needs permission to create the pgvector extension if it has not already been enabled. The backend initializes regular application tables and starter snippets/topics idempotently at startup. Embedding the first snippet may download the Sentence Transformers model.

#### Option B: Run PostgreSQL and backend with Docker Compose

From the repository root in PowerShell:

```powershell
Set-Location backend
docker compose build backend
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose up -d backend
```

Docker Compose uses the pgvector-enabled PostgreSQL image configured in `backend/docker-compose.yml`.

With either option, the API runs at `http://127.0.0.1:8000`; interactive API documentation is at `http://127.0.0.1:8000/docs`.

### 4. Start the React frontend

In a second terminal, from the repository root:

```powershell
Set-Location frontend-react
npm ci
npm run dev
```

Open `http://127.0.0.1:5500`. The Vite server is pinned to port 5500 to match the backend's local CORS allowlist. The development API URL is configured in `frontend-react/.env.development`. To override it for your machine, create `frontend-react/.env.local` based on `.env.example` and set `VITE_API_BASE_URL`.

### Optional database and embedding commands

The backend seeds starter content on startup when the relevant tables are empty. To invoke the idempotent snippet seed manually, run the command for the backend mode you selected.

Native backend, from `backend` with the virtual environment active:

```powershell
python seed.py
```

Docker Compose backend, from `backend`:

```powershell
docker compose exec backend python seed.py
```

To create or refresh embeddings for existing snippets, use the corresponding command:

Native backend, from `backend` with the virtual environment active:

```powershell
python -m app.main backfill-embeddings
```

Docker Compose backend, from `backend`:

```powershell
docker compose exec backend python -m app.main backfill-embeddings
```

New snippets are embedded through the existing add-snippet flow. If embedding generation fails while a snippet is added, the snippet remains saved and the backend logs a warning; run the backfill command to retry.

Stop the local services from `backend` with:

```powershell
docker compose down
```

This retains the database volume. `docker compose down -v` also deletes the local database volume and its data.

## Environment variables

| Variable | Required? | Purpose |
| --- | --- | --- |
| `POSTGRES_USER` | Yes for Compose | Local PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes for Compose | Local PostgreSQL password |
| `POSTGRES_DB` | Yes for Compose | Local PostgreSQL database |
| `DATABASE_URL` | Yes outside Compose | SQLAlchemy PostgreSQL connection URL; Compose sets it for the backend |
| `JWT_SECRET_KEY` | Yes | JWT signing secret |
| `JWT_ALGORITHM` | No | JWT algorithm; defaults to `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Token lifetime; defaults to 30 minutes |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | No | OAuth callback URL; defaults to local callback on port 8000 |
| `SESSION_SECRET` | No | OAuth session cookie signing secret; has a development fallback |
| `FRONTEND_URL` | No | Frontend destination after OAuth; defaults to the configured app URL |
| `GEMINI_API_KEY` | For AI features | Gemini API authentication |
| `RESEND_API_KEY` | No | Enables optional email delivery |
| `EMAIL_FROM` | No | Sender identity for Resend; has a default |
| `CRON_SECRET` | For scheduled reminders | Shared secret expected in the `X-Cron-Secret` header for `/internal/reminders/run` |
| `VITE_API_BASE_URL` | Frontend | FastAPI base URL; development config points to `http://127.0.0.1:8000` |

Keep secrets in the backend environment. Vite variables are public and must not contain secrets.

The reminder route is not a scheduler by itself: an external hourly job must call it with the `X-Cron-Secret` header. No scheduled cloud job is included or claimed in this repository.

## API highlights

The complete live schema for a running local instance is available at `/docs` and `/openapi.json`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | API health/status message |
| `POST` | `/auth/signup` | Register with email and password |
| `POST` | `/auth/login` | Authenticate and receive a JWT |
| `GET` | `/auth/google/login` | Begin Google OAuth |
| `GET` | `/auth/google/callback` | Complete Google OAuth |
| `GET` | `/users/me` | Read the authenticated user's profile |
| `GET` | `/topics` | List curated learning topics |
| `POST` | `/users/me/topics` | Save learning interests |
| `GET`, `POST` | `/users/me/reminders` | Read and save reminder preferences |
| `POST` | `/users/me/onboarding/complete` | Mark onboarding complete |
| `POST` | `/users/me/password` | Change the authenticated user's password |
| `GET` | `/tags` | List available tags |
| `GET` | `/snippets/search` | Keyword search, filters, and pagination |
| `GET` | `/snippets/semantic-search` | Semantic search with similarity scores |
| `GET` | `/snippets/daily` | Get today's UTC-pinned public snippet |
| `GET` | `/snippets/random` | Get a random public snippet |
| `GET` | `/snippets/public` | List public snippets |
| `GET` | `/snippets/mine` | List the authenticated user's snippets |
| `GET` | `/snippets/private` | List public snippets and the user's own private snippets |
| `POST` | `/snippets/add` | Add a snippet |
| `PATCH` | `/snippets/{id}/visibility` | Change visibility of an owned snippet |
| `DELETE` | `/snippets/{id}` | Delete an owned snippet |
| `POST` | `/snippets/generate-ai` | Generate a snippet draft from a topic and language |
| `POST` | `/snippets/rag` | Generate a grounded answer from authorized retrieval |
| `POST` | `/snippets/generate-rag` | Compatibility alias for the RAG endpoint |
| `GET`, `POST`, `DELETE` | `/favorites/...` | List, add, or remove favorites |
| `GET` | `/heatmap/me` | Read learning activity heatmap |
| `GET` | `/analytics/me` | Read learning analytics |
| `GET` | `/recommendations/me` | Get rule-based recommendations |
| `GET` | `/dashboard/me` | Get dashboard data |
| `POST` | `/internal/reminders/run` | Internal reminder dispatch entry point |

Personal-library, preference, favorite, analytics, and RAG operations require authentication. Public browsing and conventional search can be used without an account; the backend enforces visibility in every applicable query.

## Bulk import formats

The existing Add Snippet bulk-import UI accepts JSON, CSV, and TXT files or pasted content. The frontend parses each format to a shared snippet representation and submits through the existing backend snippet API. Required fields are `title`, `language`, and `code`.

### JSON

Provide the existing structured array format:

```json
[
  {
    "title": "Binary Search",
    "language": "C++",
    "code": "int binarySearch(...) { ... }",
    "explanation": "Searches a sorted array efficiently.",
    "tags": ["binary-search", "array"]
  }
]
```

### CSV

Use the columns `title,language,code,explanation,tags`. Quote values containing commas, quotes, or newlines. Separate tag names using `|`.

```csv
title,language,code,explanation,tags
Binary Search,C++,"int binarySearch(...) { ... }","Searches a sorted array","binary-search|array"
```

### TXT

Use labeled sections. Separate multiple snippets with a line containing `---`.

```text
TITLE: Binary Search
LANGUAGE: C++
TAGS: binary-search, array
EXPLANATION:
Searches a sorted array efficiently.

CODE:
int binarySearch(...) {
    ...
}

---

TITLE: Two Sum
LANGUAGE: Python
TAGS: array, hashmap
EXPLANATION:
Finds two numbers whose sum equals the target.

CODE:
def two_sum(nums, target):
    ...
```

The importer reports malformed content before submission and shows a parsed count/preview. Snippet embeddings use the existing backend embedding workflow; the backfill command can be used to retry or populate embeddings for existing records.

## Testing and validation

The repository includes `backend/test_phase4_retrieval.py`, a manual integration script for a running API at `http://127.0.0.1:8000`. It checks natural-language semantic queries, returned similarity scores, guest access, authenticated owner access, private-snippet exclusion for other users, and request validation. It creates test users and a private snippet, so run it only against a disposable local database. The script imports `requests`, which is not listed in the backend requirements; install it in the active environment if needed:

```powershell
python -m pip install requests
python test_phase4_retrieval.py
```

Manual verification performed during development:

| Area | Result |
| --- | --- |
| Semantic retrieval | Passed natural-language queries with similarity scores; checked guest, snippet-owner, and other-user visibility. |
| RAG generation | A relevant question returned a Gemini answer and source snippets. No-context handling and authorized-context filtering were also verified with mocked generation. |
| React Ask Library | Passed a browser check of the generated answer and displayed source snippets. |
| Bulk import | Valid JSON, CSV, and multi-snippet TXT imports passed; malformed input was rejected, and imported snippets received embeddings through the existing workflow. |
| Frontend production build | `npm run build` passed during frontend implementation. |

These are implementation-time checks, not a claim of a comprehensive automated test suite. The semantic retrieval script is the backend test file currently present; the frontend has no test script in `package.json`.

There is no frontend test script in `frontend-react/package.json`. To run the frontend production build from `frontend-react`:

```powershell
npm run build
```

FastAPI interactive API documentation is served at `/docs`.

## Deployment

This README documents local development only. The repository contains frontend environment configuration for different Vite modes, but that alone does not establish that a cloud deployment is currently configured or maintained. No hosted service or deployment workflow is claimed here.

## Future improvements

Potential future work (not currently implemented) includes:

- Hybrid keyword and semantic retrieval.
- Reranking retrieved snippets.
- Improved chunking for longer snippets.
- Background embedding generation.
- Streaming RAG responses and RAG evaluation.
- More advanced personalization.

## Legacy frontend archive

`legacy/frontend/` contains the earlier vanilla HTML/CSS/JavaScript frontend for historical reference. `frontend-react/` is the current application; the legacy frontend is not a second active frontend.

## Further reading

- [Architecture notes](docs/ARCHITECTURE.md)
- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [pgvector](https://github.com/pgvector/pgvector)
- [Sentence Transformers](https://www.sbert.net/)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)

## Author

**Shagun Kimothi**

## GitHub

[shagunkimothi/daily-code-snippet](https://github.com/shagunkimothi/daily-code-snippet)

## License

See [LICENSE](LICENSE).
