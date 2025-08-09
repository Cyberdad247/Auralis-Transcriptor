# Aurora Transcriber – Repo Hygiene and Developer Guide

This project has been hardened to keep secrets and generated artifacts out of version control, and to streamline Docker builds.

Sections
- Secrets management
- Git hooks (pre-commit protection)
- Docker build guidance
- Maintenance tips

Secrets management
- Real secrets must NOT be committed. Only example files with placeholders should be tracked.
- Backend
  - Use auralis-transcriptor/backend/.env.example as the template.
  - For local development, copy to .env.local and fill in real values:
    - PowerShell: Copy-Item auralis-transcriptor/backend/.env.example auralis-transcriptor/backend/.env.local
    - Bash: cp auralis-transcriptor/backend/.env.example auralis-transcriptor/backend/.env.local
  - Do not commit .env or .env.local.
- Rotation guidance (recommended now)
  - Supabase: rotate anon key, service key, and JWT secret.
  - Database: change Postgres password; update URLs.
  - GEMINI_API_KEY and any other provider keys: create new keys and update .env.local.

Git hooks (pre-commit protection)
- Hooks block committing:
  - Real env files (.env, .env.*) except .env.example
  - Common build outputs (dist, build, out)
  - uploads/ and logs/
- Two variants are provided under .git/hooks:
  - pre-commit (bash): runs automatically if Git Bash is available.
  - pre-commit.ps1 (PowerShell): for Windows users without Git Bash.
- To use the PowerShell hook, you can rename it to pre-commit or invoke via a wrapper .cmd, or install Git Bash. If PowerShell’s execution policy blocks the script, run PowerShell as Administrator and:
  - Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

Docker build guidance
- .dockerignore files are present to keep build contexts lean and exclude secrets and dev artifacts:
  - Root: .dockerignore
  - Backend: auralis-transcriptor/backend/.dockerignore
  - Frontend: auralis-transcriptor/frontend/auralis-transcriptor-frontend/.dockerignore
- Typical builds:
  - Backend (from backend directory):
    - docker build -t auralis-backend auralis-transcriptor/backend
  - Frontend (from frontend directory):
    - docker build -t auralis-frontend auralis-transcriptor/frontend/auralis-transcriptor-frontend
- Ensure runtime secrets are passed via environment variables or secret managers, NOT via build args.

Maintenance tips
- Keep the repo compact:
  - git gc --aggressive --prune=now
- Avoid committing build outputs and large media. Use object storage (e.g., Supabase Storage/S3) for uploads.
- If you need to share env formats, only commit .env.example with placeholders.


