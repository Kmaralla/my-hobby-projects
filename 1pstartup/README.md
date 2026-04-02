# agentstack

When you're a one-person startup, you wear four hats — founder, engineer, QA, and sales. The problem is switching between them takes mental energy you don't have.

agentstack gives you four AI specialists, all reading the same codebase, each thinking from a different seat at the table.

**[Live demo →](https://agentstack-3j0pcr119-fin-cast-ai.vercel.app)**

---

## What it actually does

Connect a GitHub repo. Then ask anything:

**As Founder** — *"Should we build this or cut scope?"*
> **GO.** This solves a real pain for engineering leads at Series A-B companies. Cut the analytics dashboard from v1 — it's scope creep. Ship the core workflow first and see if anyone asks for reporting.

**As Dev** — *"What should I fix before we ship?"*
> **SHIP WITH FIXES.** Critical: `auth/session.ts:47` — JWT secret falls back to a hardcoded string if the env var is missing. That's a production security hole. Everything else is minor.

**As QA Eng** — *"What's most likely to break?"*
> **RELEASE WITH CAVEATS.** File upload silently fails above 10MB with no user feedback. Concurrent form submissions create duplicate records. Both are reproducible, both need fixing before paying users hit them.

**As Sales** — *"How do I pitch this?"*
> **NEEDS POSITIONING WORK.** You're selling to the wrong person. The VP Eng doesn't feel this pain — the staff engineer does. Lead with "eliminates the manual review step your team hates", not "AI-powered code quality."

---

## Why not just use Claude?

Claude gives you great general answers. agentstack gives you role-specific verdicts on your actual code.

| | Claude / ChatGPT | agentstack |
|---|---|---|
| Knows your codebase | No — you paste snippets | Yes — reads your repo |
| Role-aware | Generic assistant | Founder / Dev / QA / Sales |
| Output format | Essays | GO/NO-GO, SHIP/NEEDS REWORK |
| Cross-role | No | All four roles, same project |
| Decision history | No | Pinned decision log |

---

## Setup

**Deploy your own** (5 minutes):

1. Fork this repo
2. Import into [Vercel](https://vercel.com/new)
3. Add `ANTHROPIC_API_KEY` to your environment variables
4. Deploy

**Run locally:**

```bash
git clone https://github.com/Kmaralla/agentstack-ui
cd agentstack-ui
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Get an API key at [console.anthropic.com](https://console.anthropic.com/settings/keys).

---

## How the project context works

When you connect a repo, each role loads the files most relevant to its job — not everything, just what it needs to think clearly:

- **Founder** — README, docs, changelogs. Business context first.
- **Dev** — Source files, config, architecture docs. Code first.
- **QA Eng** — Test files, CI config, then source. Coverage first.
- **Sales** — README, docs, marketing copy. Customer context first.

The project stays connected as you switch roles. Switch from Founder to Dev — it re-reads the codebase through a different lens without you doing anything.

---

## Features

**Fast vs Deep** — Default is `claude-sonnet-4-6` (fast, concise). Toggle Deep mode for `claude-opus-4-6` with extended thinking when you need a genuine deep analysis, not just a quick take.

**Ask all 4** — Runs your question across every role simultaneously. Good when a decision spans product, engineering, quality, and go-to-market at once.

**Auto-brief** — Connect a project and each role immediately tells you what it notices, without you having to ask.

**Decision log** — Pin any response with one click. Saved across sessions. Your record of what you decided and why.

**Keyboard shortcuts** — Press `1` `2` `3` `4` to switch roles without touching the mouse.

---

## Stack

- Next.js 16 (App Router, Turbopack)
- Anthropic API — `claude-sonnet-4-6` / `claude-opus-4-6`
- Tailwind CSS v4
- Deployed on Vercel

---

## The idea

Inspired by Garry Tan's [gstack](https://github.com/garrytan/gstack) — the principle that every decision in a startup needs stress-testing from multiple angles before you commit to it. This is that, connected to your actual project and tuned for the four roles a solo founder plays every day.
