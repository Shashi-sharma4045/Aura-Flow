# python-project

A simple Pomodoro time and task management application.

## Stack
- **Frontend**: React with TypeScript (Vite), minimal UI theme.
- **Backend**: Python FastAPI.
- **Database**: Supabase (PostgreSQL) – accessed via Supabase client.
- **Package manager**: npm.

## Project structure
```
python-project/
├─ backend/
│  ├─ main.py            # FastAPI app
│  ├─ requirements.txt   # Python dependencies
│  └─ .env               # Supabase credentials (example placeholders)
├─ frontend/
│  ├─ index.html
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ tsconfig.json
│  └─ src/
│     ├─ main.tsx
│     ├─ App.tsx
│     ├─ components/
│     │   ├─ Timer.tsx
│     │   └─ TaskList.tsx
│     └─ styles.css
└─ README.md
``` 

## Getting started

### Prerequisites
- Node.js (>=14) and npm
- Python 3.9+
- Supabase account (create a project and obtain `SUPABASE_URL` and `SUPABASE_ANON_KEY`)

### Setup
1. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. **Backend**
   ```bash
   cd ../backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   # copy .env.example to .env and fill in your Supabase credentials
   uvicorn main:app --reload
   ```

The frontend will communicate with the backend at `http://localhost:8000`.

## License
MIT
