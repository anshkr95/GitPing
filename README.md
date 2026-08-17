# GitPing

```
   _____ _ _   _____ _
  / ____(_) | |  __ (_)
 | |  __ _| |_| |__) | _ __   __ _
 | | |_ | | __|  ___/ | '_ \ / _` |
 | |__| | | |_| |   | | | | | (_| |
  \_____|_|\__|_|   |_|_| |_|\__, |
                               __/ |
                              |___/
```

GitPing monitors GitHub repositories and alerts you the moment a new issue opens with labels you care about.

Built to help open source contributors catch **good first issue**, **help wanted**, or **documentation** issues early without manually refreshing GitHub pages all day.

## Features

- **Watch any public repo** - search by name, language, or topic and add it to your list
- **Live label picker** - fetches the actual labels from the repo directly from GitHub's API
- **Smart matching**:
  - **Match Any** (OR) - alerts if any selected label is on the issue
  - **Match All** (AND) - alerts only if all selected labels are present
  - **Track All** - alerts on every new issue opened in that repo
- **Multi-channel alerts**:
  - HTML email via SMTP (Brevo, Gmail, Resend, etc.)
  - Browser desktop notifications
  - Audio chime
  - In-app notification center
- **Deduplication** - never get alerted twice for the same issue

## Quick start

```bash
git clone https://github.com/anshkr95/GitPing.git
cd GitPing
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Configure these in `.env.local` or your hosting dashboard:

| Variable | Description |
| --- | --- |
| `SMTP_HOST` | SMTP server host (e.g. `smtp-relay.brevo.com`) |
| `SMTP_PORT` | SMTP port (`587` or `465`) |
| `SMTP_USER` | SMTP username / login email |
| `SMTP_PASS` | SMTP password / API key |
| `SMTP_FROM` | Sender address shown in alert emails |
| `GITPING_ALERT_EMAIL` | Destination email to receive alert notifications |
| `GITHUB_TOKEN` | Optional. GitHub token for 5,000 req/hr API limits |

The app works fine without SMTP set up - it will just show in-app and browser notifications.

## Stack

- Next.js 14
- React 18
- TypeScript
- Nodemailer
- Lucide React

## License

MIT
