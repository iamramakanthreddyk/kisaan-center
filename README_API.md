## Quick local API testing

This project uses `VITE_API_BASE_URL` in the frontend. Several scripts/tests also accept `API_BASE`, `API_BASE_URL`, and `BACKEND_URL` for convenience.

Set an env file at the repo root named `.env` or use the provided `.env.sample`.

Example `.env` (development):

```env
VITE_API_BASE_URL=http://localhost:8000/api
API_BASE=http://localhost:8000/api
```

Quick checks:

- Health check (curl):

```powershell
curl -v "$env:VITE_API_BASE_URL/../health"
```

- Run the validation script (node):

```powershell
# From repo root
# Ensure you have node installed and env variables set (or .env)
node validation/validate-integration.js
```

- Run backend locally (example):

```powershell
cd kisaan-backend-node
npm install
npm run dev
# default backend listens on port 8000 (check package.json scripts)
```

- Frontend dev (reads VITE_API_BASE_URL at build):

```powershell
cd kisaan-frontend
npm install
npm run dev
# or build: npm run build
```

Notes:
- The frontend reads `import.meta.env.VITE_API_BASE_URL` at build time. Ensure Vercel/Netlify/Vite build env uses `VITE_API_BASE_URL`.
- Validation and test scripts will try `VITE_API_BASE_URL`, `VITE_API_URL`, `API_BASE_URL`, `API_BASE`, `BACKEND_URL` in that order.
