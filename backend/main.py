"""
FastAPI backend for the Pomodoro / FocusFlow app.
Hardened with defense-in-depth security headers, CORS restrictions, and production-safe configurations.
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from auth import get_current_user

load_dotenv()

# Determine environment: development vs production
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"

# Fixed: Disable interactive Swagger UI and OpenAPI documentation in production
app = FastAPI(
    title="FocusFlow API",
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)


# Fixed: Add Security Headers Middleware enforcing HSTS, CSP, X-Frame-Options, and nosniff
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# Fixed: Restrict CORS origins, methods, and headers rather than using open wildcards
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
allowed_origins = (
    [origin.strip() for origin in allowed_origins_env.split(",")]
    if allowed_origins_env
    else ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
)


@app.get("/")
async def root():
    return {"status": "ok", "message": "FocusFlow API is running 🍅"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Fixed: Protected endpoint requiring cryptographic JWT verification
@app.get("/api/me")
async def get_user_profile(user: dict = Depends(get_current_user)):
    return {
        "status": "authenticated",
        "user_id": user.get("sub"),
        "email": user.get("email"),
    }
