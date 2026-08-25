# GitPing

Track GitHub repositories and get notified when new issues match your selected labels.

GitPing is a self-hosted issue monitoring dashboard built with Python and FastAPI. Search any public repo, pick the labels you care about, and receive email alerts when matching issues are opened.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141+-009688?logo=fastapi&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- Search any GitHub repository with language, topic, and sort filters
- Pick specific labels to monitor, or track every new issue
- Email alerts the moment a matching issue appears (SMTP via Gmail, Brevo, etc.)
- Dark/light themed dashboard with real-time issue feed
- Configurable auto-polling with countdown timer
- Match modes: ANY (at least one label) or ALL (every label required)
- Optional GitHub webhook endpoint for instant detection

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, Pydantic v2 |
| HTTP | httpx (async) |
| Email | aiosmtplib |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Database | JSON file (`.data/radar-db.json`) |

## Quick Start

```bash
git clone https://github.com/anshkr95/GitPing.git
cd GitPing

python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env.local
# edit .env.local with your credentials (optional)

uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000

## Configuration

Set these in `.env.local`:

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub PAT for higher rate limits | |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP login username | |
| `SMTP_PASS` | SMTP login password | |
| `SMTP_FROM` | Custom From address | `"GitPing" <SMTP_USER>` |
| `GITPING_ALERT_EMAIL` | Fallback alert recipient | |

### Gmail Setup

1. Enable 2FA on your Google account
2. Generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Set `SMTP_USER=your-email@gmail.com` and `SMTP_PASS=your-app-password`

### Brevo (Free SMTP)

1. Sign up at [brevo.com](https://www.brevo.com)
2. Go to SMTP & API > SMTP Settings
3. Set `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_USER` and `SMTP_PASS` from Brevo

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/repos/search` | Search GitHub repositories |
| `GET` | `/api/repos/{owner}/{repo}/labels` | Get repository labels |
| `GET/POST/PATCH/DELETE` | `/api/subscriptions` | CRUD for tracked repos |
| `GET/PATCH` | `/api/issues` | List and mark detected issues |
| `GET/PATCH/DELETE` | `/api/notifications` | Notification management |
| `GET/POST` | `/api/settings` | App settings |
| `POST` | `/api/settings/test-email` | Send test email |
| `GET/POST` | `/api/monitor/scan` | Trigger issue scan |
| `POST` | `/api/webhooks/github` | GitHub webhook receiver |

## Deployment

### Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy (the included `vercel.json` handles routing)

### Render

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repo
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in the Render dashboard

## Project Structure

```
GitPing/
├── app/
│   ├── main.py               # FastAPI entry point
│   ├── config.py              # Pydantic Settings (env vars)
│   ├── models.py              # Pydantic schemas
│   ├── api/
│   │   ├── routes_repos.py
│   │   ├── routes_subscriptions.py
│   │   ├── routes_issues.py
│   │   ├── routes_notifications.py
│   │   ├── routes_settings.py
│   │   ├── routes_monitor.py
│   │   └── routes_webhooks.py
│   ├── core/
│   │   ├── constants.py       # Curated repos fallback
│   │   ├── db.py              # JSON file database
│   │   ├── github.py          # Async GitHub API client
│   │   ├── mailer.py          # Async SMTP email sender
│   │   ├── matcher.py         # Label matching engine
│   │   └── monitor.py         # Async scan engine
│   ├── static/
│   │   ├── css/style.css
│   │   └── js/app.js
│   └── templates/
│       └── index.html
├── .env.example
├── .gitignore
├── requirements.txt
├── pyproject.toml
├── vercel.json
└── README.md
```

## License

MIT
