# AGRICHAIN MVP

AGRICHAIN is a modern full-stack MVP for agricultural product traceability.

## Tech Stack
- Frontend: React, Tailwind CSS, Framer Motion, React Router, Axios
- Backend: Django, DRF, wallet auth, PostgreSQL/SQLite
- QR: `react-qr-code`, `@yudiel/react-qr-scanner`, Python `qrcode`

## Project Structure
- `backend/` Django API
- `frontend/` React app

## Backend Setup (Local)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

Backend runs on `http://localhost:8000`.

## Frontend Setup (Local)
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Production Deployment on Render

This repository includes a ready-to-deploy Render blueprint at `render.yaml`.

### Services created on Render
- `agrichain-backend` (Django web service)
- `agrichain-frontend` (Vite static site)
- `agrichain-postgres` (managed PostgreSQL)

### One-click blueprint deploy
1. Push this repo to GitHub.
2. In Render, choose **New +** -> **Blueprint**.
3. Connect the GitHub repo and deploy.
4. After first deploy, update these env vars with your real Render URLs:
   - `CORS_ALLOWED_ORIGINS`
   - `CSRF_TRUSTED_ORIGINS`
   - `FRONTEND_BASE_URL`
   - `BACKEND_BASE_URL`
   - `VITE_API_BASE_URL`

### Required environment variables
Backend variables are documented in `backend/.env.example`.
Frontend variables are documented in:
- `frontend/.env.example` (local)
- `frontend/.env.production.example` (production)

### Render build/runtime behavior
- Backend build: `backend/build.sh` (`migrate` + `collectstatic`)
- Backend start: `gunicorn farmtrace_backend.wsgi:application`
- Frontend build: `npm ci && npm run build`
- SPA route fallback configured in `render.yaml` (`/*` -> `/index.html`)

## Core Flow
1. Register with full name, email, and password
2. Login with email and password
3. Open dashboard and record crop with quantity
4. System generates unique product ID and QR code
5. Scan QR from scanner page
6. Buyer sees product verification details instantly

## API Endpoints
- `POST /api/auth/register/`
- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `GET /api/auth/me/`
- `GET /api/products/`
- `POST /api/products/` (auth required)
- `GET /api/products/<unique_code>/`
- `DELETE /api/products/<unique_code>/delete/` (auth required)
