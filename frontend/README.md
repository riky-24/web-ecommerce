# Frontend (Storefront + Admin)

Minimal React frontend built with Vite. It is intentionally tiny — only to demonstrate integrations with the backend API.

Run locally:

```bash
cd frontend
npm install
npm run dev
```

The frontend uses `VITE_API_BASE` at build time for production API base (e.g., `VITE_API_BASE=https://api.example.com`). In development the `vite` dev server proxies `/products`, `/checkout`, and other endpoints to `http://localhost:3000` (see `vite.config.js`).
