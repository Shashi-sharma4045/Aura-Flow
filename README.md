# 🍅 FocusFlow – Deep Work & Pomodoro Dashboard

> A high-performance Pomodoro workspace and procedural soundscape generator designed for deep flow states, backed by FastAPI, Supabase, and React 18.

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 🎯 Features

- **Procedural Soundscapes**: Real-time Web Audio API ambient generators (Rain, Deep Ocean Swell, Nocturnal Cafe, Alpine Forest, 432Hz Binaural Beats).
- **Intelligent Timer**: Customizable Focus, Short Break, and Long Break intervals with interval auto-cycling.
- **Task Velocity Tracking**: Categorized task planning with live session logging and weekly velocity analytics.
- **Zero-Bypass Authentication**: Hardened Supabase Authentication with Google Identity Services (GSI) OAuth and cryptographic JWT validation.
- **Production Hardened**: Defensive security headers (HSTS, CSP, X-Frame-Options), strict input validation, and code-split chunks.

---

## 📸 Demo Preview

```
+----------------------------------------------------------------------------+
|  FOCUSFLOW  |  [25:00] Focus  |  🌧️ Rain (65%)  |  alex.focus@flow.io      |
+----------------------------------------------------------------------------+
|  [Sidebar]  |                     [ 24:18 ]                                |
|  - Timer    |              ( ● Focus Interval #3 )                         |
|  - Tasks    |          [ PAUSE ]  [ SKIP ]  [ RESET ]                      |
|  - Sounds   |                                                              |
|  - Analytics|  Active Task: Designing UI Design System                     |
|  - Settings |  Logged: 45m / 50m | Priority: High                          |
+----------------------------------------------------------------------------+
```

---

## 🛠️ Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `v20.x` or higher
- **npm**: `v9.x` or higher
- **Python**: `3.9+` (Recommended: `3.11+`)
- **Supabase Account**: A free project at [supabase.com](https://supabase.com)

---

## 🚀 Step-by-Step Setup

### 1. Clone the Repository
```bash
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
cd <YOUR_REPOSITORY>
```

### 2. Frontend Configuration & Setup
```bash
cd frontend

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start local Vite development server
npm run dev
```
The frontend will start at `http://localhost:5173`.

### 3. Backend Configuration & Setup
```bash
cd ../backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Start FastAPI development server
uvicorn main:app --reload --port 8000
```
The backend API will run at `http://localhost:8000`.

---

## 🔐 Environment Variables

### Frontend (`frontend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xyzproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase publishable/anon key | `sb_publishable_...` |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud OAuth Client ID | `23149...apps.googleusercontent.com` |

### Backend (`backend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Runtime environment (`development` / `production`) | `development` |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret for backend token verification | `your-supabase-jwt-secret` |
| `ALLOWED_ORIGINS` | Comma-delimited list of allowed CORS origins | `http://localhost:5173,http://localhost:3000` |

---

## 📦 Available Scripts

### Frontend (`frontend/`)
- `npm run dev`: Launch local Vite dev server with Hot Module Replacement (HMR).
- `npm run build`: Compile TypeScript and build code-split production bundles in `dist/`.
- `npm run preview`: Locally preview the production build artifacts.
- `node test_security.mjs`: Execute the frontend security regression test suite.

### Backend (`backend/`)
- `uvicorn main:app --reload --port 8000`: Run local FastAPI dev server.
- `python test_security.py`: Execute backend security and header validation tests.

---

## 📁 Project Structure

```
python-project/
├── .github/
│   ├── workflows/
│   │   └── ci.yml             # GitHub Actions CI pipeline
│   └── pull_request_template.md
├── backend/
│   ├── auth.py                # Supabase JWT HTTPBearer verification
│   ├── main.py                # FastAPI application & security middleware
│   ├── requirements.txt       # Python dependencies
│   ├── test_security.py       # Backend security regression tests
│   └── .env.example           # Backend environment template
├── frontend/
│   ├── public/
│   │   ├── favicon.svg        # App icon
│   │   ├── robots.txt         # Crawler indexing rules
│   │   └── sitemap.xml        # Static site index
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx  # Pomodoro workspace & soundboard
│   │   │   └── Login.tsx      # Hardened auth & OAuth entry point
│   │   ├── utils/
│   │   │   ├── audioEngine.ts # Procedural Web Audio API soundscapes
│   │   │   └── security.ts    # Input validation & error sanitization
│   │   ├── App.tsx            # Code-split router & session supervisor
│   │   ├── main.tsx           # React DOM root entry
│   │   ├── styles.css         # Minimal theme styling
│   │   └── supabaseClient.ts  # Configured Supabase JS client
│   ├── index.html             # HTML entry with strict CSP & SEO meta
│   ├── package.json           # Node scripts and dependencies
│   ├── test_security.mjs      # Frontend unit & security test runner
│   ├── tsconfig.json          # TypeScript compiler configuration
│   ├── vite.config.ts         # Vite configuration with backend proxy
│   └── .env.example           # Frontend environment template
├── .gitignore                 # Root ignore rules (secrets, venv, node_modules)
└── README.md                  # Project documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
