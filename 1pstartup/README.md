# agentstack

agentstack gives a solo founder five AI specialists looking at the same project from different seats at the table: Founder, Product, Dev, QA Eng, and Sales.

Connect a GitHub repo or local project, ask a question, and switch roles when you need a different kind of judgment.

---

## What It Does

Connect a project, then ask questions like:

**Founder** — "Is this worth building now?"
> Company-level bet, market risk, focus trade-offs, validation, and GO / NO-GO / PIVOT calls.

**Product** — "What should the next release include?"
> User job, PRD-style requirements, P0/P1/P2 scope, UX risks, success metrics, and handoff notes.

**Dev** — "What should I fix before merge?"
> Correctness, security, reliability, architecture, maintainability, and engineering verification.

**QA Eng** — "What is most likely to break?"
> Release-blocking flows, failure modes, regression risk, test strategy, and release gates.

**Sales** — "How do I sell this?"
> Buyer pain, value prop, sales motion, objections, proof needed, and pitch language.

---

## Why Not Just Use Claude?

Claude gives strong general answers. agentstack gives role-specific verdicts grounded in your actual project files.

| | Claude / ChatGPT | agentstack |
|---|---|---|
| Knows your codebase | Only what you paste | Loads relevant repo files |
| Role-aware | Generic assistant | Founder / Product / Dev / QA / Sales |
| Output style | Broad essays | Role-specific verdicts and next steps |
| Cross-role review | Manual | Ask every role at once |
| Decision history | Manual notes | Pinned decision log |

---

## Requirements

- Node.js 20 or newer
- npm
- An Anthropic API key for real chat responses

Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com/settings/keys).

---

## Local Setup

```bash
git clone https://github.com/Kmaralla/my-hobby-projects.git
cd my-hobby-projects/1pstartup
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AGENTSTACK_MOCK_CHAT=0
```

Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Do not commit `.env.local`. It is ignored by git. Keep real API keys only in local environment files or your deployment provider's secret manager.

---

## Environment Variables

| Variable | Required | Used by | Description |
|---|---:|---|---|
| `ANTHROPIC_API_KEY` | Yes, for real AI responses | Server | API key used by `@anthropic-ai/sdk`. Leave empty only when using mock chat for smoke tests. |
| `AGENTSTACK_MOCK_CHAT` | No | Server / smoke test | Set to `1` for deterministic mock chat responses. Useful for local smoke tests and CI. Default: `0`. |
| `NEXT_PUBLIC_VERCEL_ENV` | No | Client | Automatically set by Vercel. When present, the UI hides local-path loading because deployed apps cannot read your local filesystem. |

No secrets are required in the repository. The committed [.env.example](./.env.example) contains placeholders only.

---

## Connecting Projects

### Public GitHub Repos

Paste a repo URL:

```text
https://github.com/owner/repo
```

You can also load a specific folder:

```text
https://github.com/owner/repo/tree/main/path/to/folder
```

agentstack resolves the branch and folder, loads only relevant files for the selected role, and keeps that project connected as you switch roles.

### Private GitHub Repos

For private repos, paste a GitHub token in the UI when connecting the project.

Use the least privilege token that can read the target repo. The token is sent to your own server route to call GitHub and is not stored in localStorage by the app.

### Local Projects

When running locally, you can load an absolute path:

```text
/Users/you/projects/my-app
```

Local project loading is disabled in deployed Vercel environments.

---

## Scripts

```bash
npm run dev      # start local development server
npm run build    # production build and TypeScript check
npm run start    # start the production build
npm run smoke    # local smoke test for project loading + streaming chat
```

The smoke test starts the app on a temporary local port, loads:

```text
https://github.com/Kmaralla/my-hobby-projects/tree/main/1pstartup
```

Then it calls the streaming chat endpoint with `AGENTSTACK_MOCK_CHAT=1`, so it does not require a real Anthropic API call.

To smoke-test another public repo or folder:

```bash
SMOKE_REPO_URL=https://github.com/owner/repo/tree/main/path npm run smoke
```

---

## Deploying To Vercel

1. Fork or import the repo into Vercel.
2. Set `ANTHROPIC_API_KEY` in Vercel Project Settings → Environment Variables.
3. Deploy.

Optional:

- Leave `AGENTSTACK_MOCK_CHAT` unset or set to `0` for production.
- Set it to `1` only for preview environments where you want deterministic mock responses.

---

## How Project Context Works

Each role loads a different slice of the project:

- **Founder**: README, docs, roadmap, product context, and high-level source signals.
- **Product**: docs, PRDs, roadmap, UI surfaces, user flows, and product-facing source.
- **Dev**: source files, config, architecture docs, server/API code, and workflows.
- **QA Eng**: tests, CI config, source files, and flows that need release confidence.
- **Sales**: README, docs, changelog, marketing copy, and product feature surfaces.

The app estimates token budget per role and selects the most relevant files before sending context to the model.

---

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4
- Anthropic SDK
- GitHub API for remote project loading

---

## Open Source Safety Notes

- Never commit `.env.local`, real API keys, or GitHub tokens.
- Keep `.env.example` as placeholders only.
- Use deployment environment variables for production secrets.
- Prefer short-lived or least-privilege GitHub tokens for private repo testing.
- Review logs before deploying changes that handle secrets or repo contents.

---

## Inspiration

Inspired by Garry Tan's [gstack](https://github.com/garrytan/gstack): every startup decision benefits from stress-testing across different functional lenses before you commit.
