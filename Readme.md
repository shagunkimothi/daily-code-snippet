# 🧩 Daily Code Snippet

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![JavaScript](https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)

**Daily Code Snippet** is a robust, full-stack developer productivity application designed to help users discover, generate, and organize code snippets. By leveraging **Google Gemini 2.0 Flash**, it provides intelligent snippet generation, while a **FastAPI** backend ensures high-performance data management and secure authentication.

---

## 🚀 Key Features

### 🧠 AI-Powered Intelligence
* **Smart Generation**: Utilize the `gemini-2.0-flash` model to generate custom snippets with accurate explanations and metadata.
* **Automated Metadata**: AI automatically assigns titles, programming languages, tags, and difficulty levels (Beginner, Intermediate, Advanced).

### 📊 Developer Insights
* **Activity Heatmap**: Track your consistency with a GitHub-style contribution graph that visualizes your daily snippet saves and creations.
* **Dynamic Dashboard**: Access real-time statistics, including your most used languages, total snippet count, and recent activity streaks.

### 🛠️ Advanced Management
* **Discovery Engine**: Search and filter through a global library using keywords, languages, or specific tags.
* **Visibility Controls**: Toggle snippets between **Public** (community-shared) and **Private** (personal) visibility.
* **Syntax Highlighting**: Real-time, beautiful code rendering using **Prism.js** with support for dozens of languages.

### 🔐 Security & UX
* **Hybrid Authentication**: Secure access via **JWT (JSON Web Tokens)** or seamless **Google OAuth** integration.
* **Theme Engine**: Fully responsive UI with persistent **Dark/Light mode** preferences.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | FastAPI (Asynchronous Python), SQLAlchemy ORM |
| **AI Integration** | Google Generative AI SDK (`gemini-2.0-flash`) |
| **Security** | JWT (jose), Passlib (bcrypt), Authlib (OAuth2) |
| **Frontend** | Vanilla JavaScript (ES6+), Tailwind CSS (CDN), Prism.js |
| **Database** | SQLite (Production-ready via SQLAlchemy) |

---

## 📂 Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py          # Application entry point & API routes
│   │   ├── models.py        # Database models (User, Snippet, Tag, Activity)
│   │   ├── schemas.py       # Pydantic models for data validation
│   │   ├── security.py      # Password hashing and JWT generation
│   │   ├── auth.py          # OAuth and Authentication logic
│   │   └── database.py      # SQLAlchemy engine and session management
│   ├── requirements.txt     # Python dependencies
│   └── seed.py              # Utility to populate initial library data
└── frontend/
    ├── index.html           # Main application shell
    ├── dashboard.html       # User analytics and heatmap view
    ├── auth.html            # Login and registration interface
    ├── script.js            # Core frontend logic and API integration
    └── style.css            # Custom layout and component style
```
---      

## Installation 
1. Environment Configuration
Navigate to the backend/ directory and create a .env file:

## Code snippet
GEMINI_API_KEY=your_google_ai_studio_key
SECRET_KEY=your_jwt_secret_signing_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
 # 2. Backend Setup

```bash
# Enter backend directory
cd backend
```
# Create and activate virtual environment
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```
# Install dependencies
```bash
pip install -r requirements.txt
```

# Start the server
```bash
uvicorn app.main:app --reload
```
# 3. Frontend Setup
The frontend is built with vanilla technologies and can be served via any local server.

```bash
# Example using Python's built-in server
cd frontend
python -m http.server 5500
Access the app at http://localhost:5500.
```
 # 📄 License
# This project is licensed under the MIT License. See the LICENSE file for details.    