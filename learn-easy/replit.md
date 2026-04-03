# Learn-AI - Adaptive AI Learning Platform

## Overview
Learn-AI is an innovative learning platform that teaches AI concepts through an adaptive, quiz-style experience. Instead of traditional module-based courses, it presents one learning card at a time, adapting difficulty based on user performance.

## Current State (Dec 2024)
Enhanced MVP with:
- User login with name capture (localStorage persistence)
- Extended lesson format: 2 theory pages (concept + real-world example) + 1 quiz per lesson
- Step progress indicators (1/3, 2/3, 3/3) showing position within each lesson
- Prominent difficulty level badges with color coding (beginner=blue, intermediate=amber, advanced=emerald)
- Score/accuracy tracking in header
- Adaptive difficulty: unlock intermediate at 80% accuracy (3+ questions), advanced at 90% (6+ questions)
- 7 complete lessons covering AI Agents fundamentals

## Tech Stack
- **Frontend**: React + TypeScript, Vite, TailwindCSS, Shadcn/ui, Framer Motion
- **Backend**: Express.js + TypeScript
- **State**: In-memory storage (MemStorage)
- **Styling**: Custom design system with Inter font

## Learning Flow
1. User enters their name to start (stored in localStorage)
2. User sees a **concept card** with theory and key takeaway (Step 1/3)
3. User clicks "Continue to Example"
4. User sees an **example card** with real-world scenario and application (Step 2/3)
5. User clicks "Ready for Quiz"
6. User answers a **scenario-based question** (Step 3/3)
7. Immediate feedback with explanation
8. System advances to next lesson
9. Difficulty adapts based on performance (80% -> intermediate, 90% -> advanced)

## Adaptive System
- Beginners see only beginner content initially
- After 80%+ accuracy (3+ questions): unlock intermediate content
- After 90%+ accuracy (6+ questions): unlock advanced content
- System automatically selects appropriate difficulty level

## Content Topics (from Amazon Science AI Agents blog)
1. What is an AI Agent
2. ReAct Pattern (Think, Act, Observe)
3. Agent Memory Systems
4. Tools & APIs
5. Multi-Agent Architecture
6. Agent Safety & Guardrails
7. Code Interpreters

## Project Structure
```
client/
├── src/
│   ├── components/     # UI components
│   ├── pages/
│   │   ├── dashboard.tsx   # Main learning experience
│   │   ├── progress.tsx    # Progress tracking
│   │   └── profile.tsx     # User profile
│   └── App.tsx
server/
├── routes.ts           # API endpoints
├── storage.ts          # Learning cards & adaptive logic
shared/
└── schema.ts           # TypeScript types
```

## API Endpoints
- `GET /api/learn` - Current learning card + user stats
- `POST /api/next-card` - Advance to next card
- `POST /api/answer` - Submit answer and update stats
- `GET /api/user/credits` - Current user credits
- `GET /api/progress` - User progress data
- `GET /api/profile` - User profile with achievements

## Running the App
The app runs on port 5000 with `npm run dev`

## Design System
- Font: Inter (body)
- Theme: Light/dark mode support
- Colors: Blue primary, semantic success/warning colors
- See design_guidelines.md for full specifications
