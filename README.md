# AGRICHAIN MVP

AGRICHAIN is a modern full-stack MVP for agricultural product traceability.

## Tech Stack
- Frontend: React, Tailwind CSS, Framer Motion, React Router, Axios
- Backend: Django, DRF, JWT auth, SQLite
- QR: `react-qr-code`, `@yudiel/react-qr-scanner`, Python `qrcode`

## Project Structure
- `backend/` Django API
- `frontend/` React app

## Backend Setup
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

## Frontend Setup
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend runs on `http://localhost:5173`.

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
