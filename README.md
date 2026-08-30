# GitPing

Track GitHub repositories and get notified when new issues match your selected labels.

GitPing is a self-hosted issue monitoring dashboard built with Python and FastAPI. Search any public repo, pick the labels you care about, and receive email alerts when matching issues are opened.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141+-009688?logo=fastapi&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- Search any GitHub repository with language, topic, and sort filters
- Pick specific labels to monitor, or track every new issue
- Email alerts the moment a matching issue appears
- Dark/light themed dashboard with real-time issue feed
- Configurable auto-polling with countdown timer
- Match modes: ANY or ALL label matching
- GitHub webhook endpoint for instant detection

## Quick Start

```bash
git clone https://github.com/anshkr95/GitPing.git
cd GitPing

python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
cp .env.example .env.local

uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000

## Configuration

Copy `.env.example` to `.env.local` and set any values you need:

| Variable | Description |
|----------|-------------|
| `GITHUB_TOKEN` | GitHub PAT for higher API rate limits |
| `SMTP_HOST` | SMTP server hostname (default: `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (default: `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Required on Vercel for durable tracking state |

## Deployment

**Render:** Set build command to `pip install -r requirements.txt` and start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

**Vercel:** Import the repo, attach a Vercel KV database, and redeploy. The KV integration supplies `KV_REST_API_URL` and `KV_REST_API_TOKEN`; without them, Vercel cannot persist tracked repositories between function invocations.

## License

MIT
