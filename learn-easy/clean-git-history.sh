#!/bin/bash

# Script to clean git history and remove Replit commits
# This creates a fresh history with one initial commit

set -e  # Exit on error

echo "🧹 Cleaning git history..."
echo ""

# Step 1: Create backup branch (safety first)
echo "📦 Creating backup branch..."
git branch backup-before-cleanup 2>/dev/null || echo "Backup branch already exists or not needed"
echo "✅ Backup created (or already exists)"
echo ""

# Step 2: Stage all current changes
echo "📝 Staging all current changes..."
git add .
echo "✅ All files staged"
echo ""

# Step 3: Create orphan branch (no history)
echo "🌱 Creating fresh branch with no history..."
git checkout --orphan fresh-start
echo "✅ New orphan branch created"
echo ""

# Step 4: Add all files
echo "📦 Adding all files to new branch..."
git add .
echo "✅ All files added"
echo ""

# Step 5: Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Learn-Easy open source release

- Docker Compose setup for local development
- AWS CloudFormation templates for deployment
- Database persistence with PostgreSQL
- User authentication and session management
- Topic-based day unlocking system
- Content ingestion endpoints (PDF/URL)
- Progress tracking with expertise levels
- Structured learning: Theory → Analogy → Quiz"
echo "✅ Initial commit created"
echo ""

# Step 6: Delete old main branch
echo "🗑️  Deleting old main branch..."
git branch -D main
echo "✅ Old main branch deleted"
echo ""

# Step 7: Rename new branch to main
echo "🔄 Renaming branch to main..."
git branch -m main
echo "✅ Branch renamed to main"
echo ""

# Step 8: Show new history
echo "📜 New git history:"
git log --oneline
echo ""

echo "✨ Done! Your git history is now clean."
echo ""
echo "⚠️  Next steps:"
echo "   1. Review the new history: git log"
echo "   2. If you have a remote, force push: git push -f origin main"
echo "   3. If creating new repo, add remote: git remote add origin <url>"
echo ""
echo "💡 To restore old history: git checkout backup-before-cleanup"
