from fastapi import FastAPI

app = FastAPI(title="Daily Code Snippet API")

@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}
