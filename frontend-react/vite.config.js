import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // 5500, not 3000: the backend's CORS `origins` list (backend/app/main.py)
    // only allows http(s)://[127.0.0.1|localhost]:5500 (the old VS Code Live
    // Server default) for local dev, plus :8000 (the backend itself) and the
    // deployed Vercel/GitHub Pages URLs. Port 3000 was never actually
    // allowlisted — using it would make every API call fail with a CORS
    // error in the browser despite looking fine in curl/Postman.
    port: 5500,
    strictPort: true,
  },
});
