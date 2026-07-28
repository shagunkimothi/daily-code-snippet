// frontend/config.js

const isLocal = window.location.hostname === "localhost" || 
                window.location.hostname === "127.0.0.1";

const CONFIG = {
    API_BASE_URL: isLocal 
        ? "http://127.0.0.1:8000" 
        : "https://daily-code-snippet.onrender.com",
    
    FRONTEND_URL: isLocal 
        ? (window.location.port === "5500" ? "http://127.0.0.1:5500/frontend" : "http://localhost:3000")
        : "https://daily-code-snippet.vercel.app"
};

export default CONFIG;