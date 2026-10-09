"""Settings read from environment variables, with defaults for local development."""

import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./zoom_clone.db")

# Public URL of the Next.js app. Used to build shareable invite links.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# Seeded demo account, so the app can be tried without signing up.
DEMO_EMAIL = "sanil@zoomclone.dev"
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "zoomdemo123")

# How long a sign-in lasts before the user has to sign in again.
SESSION_DAYS = int(os.getenv("SESSION_DAYS", "30"))

# Comma-separated list of origins allowed to call the API from a browser.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", FRONTEND_URL).split(",")
    if origin.strip()
]
