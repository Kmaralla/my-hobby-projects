# Learn-Easy - Structured Learning Platform

> Transform any content (PDFs, URLs, topics) into structured learning experiences. Built for individuals and teams who want structured learning paths, not ad-hoc chat.

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](README.md#-quick-start)
[![Vercel](https://img.shields.io/badge/Vercel-Ready-black)](README.md#-vercel--supabase-deployment-recommended)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e)](README.md#-vercel--supabase-deployment-recommended)
[![AWS](https://img.shields.io/badge/AWS-Ready-orange)](README.md#-aws-deployment)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

![Learn-Easy Dashboard](./docs/screenshots/dashboard.png)

> **Note:** Add screenshots to `docs/screenshots/` directory. See [SCREENSHOT_GUIDE.md](./docs/screenshots/SCREENSHOT_GUIDE.md) for details.

## 🎯 What is Learn-Easy?

Learn-Easy is a **structured learning platform** that transforms content into organized lessons. Unlike chat-based tools (NotebookLM, ChatGPT), Learn-Easy provides:

- **Structured 3-step lessons**: Theory → Analogy → Quiz (not ad-hoc Q&A)
- **Day-based progression**: Topics unlock sequentially (Day 1, Day 2, etc.)
- **Assessment & mastery**: Built-in quizzes prove you actually learned
- **Progress tracking**: Expertise levels, streaks, completion metrics
- **Social learning**: Leaderboards showing who's learning what (coming soon)
- **Self-hosted**: Your data, your infrastructure (Docker/AWS ready)

### Why this is 3x more valuable than "LLM flashcards"

Learn-Easy is designed as a mastery system, not a one-time generation tool:

1. **Outcome-first learning loop**: users progress through Theory -> Example -> Quiz with tracked mastery.
2. **Personalized momentum**: daily goals, lock states, and next-goal nudges drive consistent progress.
3. **Social accountability**: leaderboard + completion analytics show who is truly learning, not just reading.

## 🆚 How It Differs from Existing Tools

| Feature | NotebookLM/ChatGPT | Learn-Easy |
|---------|-------------------|------------|
| **Learning Style** | Chat-based Q&A | Structured 3-step lessons |
| **Assessment** | None | Built-in quizzes & mastery tracking |
| **Progress Tracking** | None | Expertise levels, streaks, completion % |
| **Structure** | Ad-hoc (you decide) | Enforced learning paths |
| **Team Learning** | Individual only | Team-wide with leaderboards |
| **Deployment** | Cloud only | Self-hosted (Docker/AWS) |
| **Content Organization** | Document-based | Topic-based (combine multiple sources) |
| **Adaptive Difficulty** | Same for everyone | Adjusts to your level |

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** (for cloning)

### Installation (3 Steps)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/learn-easy.git
cd learn-easy

# 2. Start everything (PostgreSQL + App)
docker compose up

# 3. Initialize database (in a new terminal)
docker compose exec app npm run db:push
```

**That's it!** Access the app at:
- **User Interface**: http://localhost:5001
- **Admin Panel**: http://localhost:5001/admin (password: `admin123`)

![Setup Complete](./docs/screenshots/setup-complete.png)

## 📋 Dependencies

### For Docker (Recommended)
- Docker Desktop
- Docker Compose v2+

### For Manual Setup
- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

## 🎨 Features

### For Learners
- 📚 **Structured Lessons**: Theory → Analogy → Quiz progression
- 🎯 **Day-Based Unlocking**: Topics unlock sequentially (Day 1, Day 2, etc.)
- 📊 **Progress Tracking**: Expertise levels, streaks, completion percentages
- 🏆 **Gamification**: Credits, achievements, daily missions
- 🎨 **Modern UI**: Beautiful gradient themes, dark mode support

### For Admins
- 📄 **Content Ingestion**: Upload PDFs, add URLs, or specify topics
- 🤖 **AI Lesson Generation**: Auto-generate lessons from content (requires OpenAI API key)
- 👥 **User Management**: Create and manage users for your team
- 📈 **Analytics**: Track learning progress across users

![Admin Panel](./docs/screenshots/admin-panel.png)
*Admin interface for content management and user oversight*

## 🛠️ Manual Setup (Without Docker)

If you prefer not to use Docker:

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp env.example .env
# Edit .env and set:
# - DATABASE_URL=postgresql://user:pass@localhost:5432/learn_easy
# - ADMIN_PASSWORD=your-secure-password
# - OPENAI_API_KEY=your-key (optional, for AI features)

# 3. Start PostgreSQL (if not running)
# On Mac: brew services start postgresql@15
# On Linux: sudo systemctl start postgresql

# 4. Initialize database
npm run db:push

# 5. Start the app
npm run dev
```

Access at http://localhost:5000

## ☁️ AWS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete AWS CloudFormation deployment guide.

Quick overview:
- RDS PostgreSQL database
- S3 storage for file uploads
- ECS/Fargate for application hosting
- One-command deployment with CloudFormation

## ▲ Vercel + Supabase Deployment (Recommended)

This repo now supports a hosted open-source stack without Docker:

- **Frontend** on Vercel (Vite static output)
- **API** on Vercel Functions (`api/index.ts`)
- **Postgres/Auth** on Supabase

### 1) Create Supabase project

- Create a new project in Supabase.
- Copy:
  - Project URL
  - `anon` key
  - `service_role` key
  - Postgres connection string

### 2) Configure environment variables

Set these in Vercel Project Settings -> Environment Variables:

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
DATABASE_SSL=true
SESSION_SECRET=replace_with_long_random_secret
ADMIN_PASSWORD=replace_with_secure_admin_password
OPENAI_API_KEY=your_openai_api_key

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3) Run schema migration

From your local machine (pointing to Supabase `DATABASE_URL`):

```bash
npm install
npm run db:push
```

### 4) Deploy to Vercel

- Import this repository into Vercel.
- Vercel automatically uses `vercel.json`.
- Build command: `npm run build`
- Output directory: `dist/public`

### 5) Supabase auth bridge (current behavior)

- Existing username/session login still works.
- New endpoint `/api/auth/supabase-login` accepts a Supabase access token and maps it to a local learning profile.
- This allows incremental migration to full Supabase-auth UI without breaking existing users.

## 📖 Usage Guide

### First Time Setup

1. **Access Admin Panel**: http://localhost:5001/admin
2. **Login**: Use password from `.env` (default: `admin123`)
3. **Quick Create Topic** (Recommended):
   - Go to "Topics" tab
   - Click "Create Topic from URL"
   - Enter topic name (e.g., "Attention is All You Need")
   - Enter URL (e.g., https://arxiv.org/abs/1706.03762)
   - Set unlock day (Day 1 = immediately available)
   - Click "Create Topic & Generate Lessons"
   - System will automatically: scrape content → create topic → generate structured lessons (theory + analogies + quiz)
4. **Manual Content Management** (Alternative):
   - Upload PDFs via "Sources" tab
   - Add URLs for web content
   - Create topics manually and link sources
   - Manually add concepts and questions

### For Users

1. **Register/Login**: Create account at http://localhost:5001
2. **Start Learning**: Day 1 topics are unlocked automatically
3. **Progress**: Complete lessons (Theory → Analogy → Quiz)
4. **Track Progress**: See expertise levels, streaks, completion %

![Learning Flow](./docs/screenshots/learning-flow.png)
*Structured 3-step learning: Theory → Analogy → Quiz*

## 🏗️ Project Structure

```
learn-easy/
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Dashboard, Admin, Lesson pages
│   │   ├── components/ # UI components
│   │   └── lib/        # Utilities
├── server/             # Express backend
│   ├── routes.ts       # User API routes
│   ├── admin-routes.ts # Admin API routes
│   ├── auth-routes.ts  # Authentication
│   └── ai-service.ts   # OpenAI integration
├── shared/
│   └── schema.ts       # Database schema (Drizzle ORM)
├── cloudformation/     # AWS deployment templates
└── docker-compose.yml  # Local development setup
```

## 🔧 Configuration

### Environment Variables

Create `.env` from `env.example`:

```env
# Database (required)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/learn_easy
DATABASE_SSL=false

# Server
PORT=5000
NODE_ENV=development

# Admin
ADMIN_PASSWORD=your-secure-password

# Optional: AI features
OPENAI_API_KEY=your-openai-api-key

# Optional: Session
SESSION_SECRET=your-secret-key

# Optional: Supabase (recommended for Vercel hosted mode)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## ✅ Current Status

### Implemented ✅
- ✅ Database persistence (PostgreSQL)
- ✅ User authentication (session-based)
- ✅ Topic unlocking (day-based)
- ✅ Progress tracking (expertise, streaks, credits)
- ✅ Content ingestion endpoints (PDF/URL)
- ✅ AI service for lesson generation
- ✅ Docker Compose setup
- ✅ AWS CloudFormation templates
- ✅ Modern UI with gradient themes

### In Progress 🚧
- 🚧 PDF text extraction (needs `pdf-parse` package)
- 🚧 Website scraping (needs `puppeteer`/`cheerio`)
- 🚧 Leaderboard UI (schema ready)

## 🐛 Troubleshooting

### Port 5000 Already in Use
If you see "port already in use", the app runs on port 5001. Access at http://localhost:5001

### Database Connection Error
Make sure PostgreSQL is running:
```bash
docker compose ps  # Check if postgres container is running
```

### esbuild Platform Error
If you see esbuild errors, rebuild the Docker image:
```bash
docker compose build --no-cache
docker compose up
```

## 📚 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide (Docker + AWS)
- [API Documentation](./docs/API.md) - API endpoints reference

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/learn-easy/issues)
- **Questions**: Open a discussion on GitHub

---

**Built for teams, students, and organizations who want structured, social learning experiences.**
