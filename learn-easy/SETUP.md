# Setup Guide - Learn-Easy

Complete setup instructions for Learn-Easy platform.

## 📋 Prerequisites

### Option 1: Docker (Recommended - Easiest)
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** (for cloning repository)

### Option 2: Manual Setup
- **Node.js 18+** ([Download](https://nodejs.org/))
- **PostgreSQL 15+** ([Download](https://www.postgresql.org/download/))
- **npm** (comes with Node.js)

## 🚀 Quick Start (Docker)

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/learn-easy.git
cd learn-easy
```

### Step 2: Start Services
```bash
docker compose up
```

This starts:
- PostgreSQL database (port 5432)
- Learn-Easy application (port 5001)

### Step 3: Initialize Database
In a **new terminal window**:
```bash
docker compose exec app npm run db:push
```

### Step 4: Access Application
- **User Interface**: http://localhost:5001
- **Admin Panel**: http://localhost:5001/admin
  - Password: `admin123` (or value from `.env`)

**That's it!** You're ready to use Learn-Easy.

## 🛠️ Manual Setup (Without Docker)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup PostgreSQL

**On macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**On Linux:**
```bash
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

**On Windows:**
Download and install from [PostgreSQL website](https://www.postgresql.org/download/windows/)

### Step 3: Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE learn_easy;

# Exit
\q
```

### Step 4: Configure Environment
```bash
cp env.example .env
```

Edit `.env` and set:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/learn_easy
ADMIN_PASSWORD=your-secure-password
SESSION_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-key  # Optional, for AI features
```

### Step 5: Initialize Database
```bash
npm run db:push
```

### Step 6: Start Application
```bash
npm run dev
```

Access at http://localhost:5000

## 🔑 Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_PASSWORD` - Admin panel password

### Optional
- `OPENAI_API_KEY` - For AI-powered lesson generation
- `SESSION_SECRET` - Session encryption key
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

## ✅ Verification

### Check if Everything Works

1. **Health Check:**
   ```bash
   curl http://localhost:5001/api/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

2. **Database Tables:**
   ```bash
   docker compose exec postgres psql -U postgres -d learn_easy -c "\dt"
   ```
   Should list tables: users, topics, concepts, etc.

3. **UI Access:**
   - Open http://localhost:5001
   - Should see dashboard

4. **Admin Panel:**
   - Open http://localhost:5001/admin
   - Login with admin password
   - Should see admin interface

## 🐛 Common Issues

### Port Already in Use
**Error**: `Ports are not available: exposing port TCP 0.0.0.0:5000`

**Solution**: The app uses port 5001. Access at http://localhost:5001

### Docker Not Running
**Error**: `Cannot connect to the Docker daemon`

**Solution**: Start Docker Desktop application

### esbuild Platform Error
**Error**: `You installed esbuild for another platform`

**Solution**: 
```bash
docker compose down
docker compose build --no-cache
docker compose up
```

### Database Connection Failed
**Error**: `Connection refused` or `database does not exist`

**Solution**:
1. Check PostgreSQL is running: `docker compose ps`
2. Verify DATABASE_URL in `.env`
3. Recreate database: `docker compose down -v && docker compose up`

## 📝 Next Steps

After setup:
1. **Create Admin Account**: Login to admin panel
2. **Upload Content**: Add PDFs or URLs
3. **Create Topics**: Organize content into topics
4. **Generate Lessons**: AI will create lessons if API key is set
5. **Start Learning**: Register as user and begin learning

## 🆘 Need Help?

- Check [README.md](./README.md) for overview
- Open [GitHub Issue](https://github.com/yourusername/learn-easy/issues)
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for AWS setup
