# Learn-AI Interactive Learning Platform - Design Guidelines

## Design Approach
**Hybrid System**: Linear's clean minimalism + Duolingo's playful engagement patterns + Notion's progressive disclosure. Focus on reducing cognitive load while maintaining motivation through subtle gamification.

## Core Design Principles
1. **Progressive Revelation**: Show one concept at a time, expand complexity gradually
2. **Immediate Feedback**: Visual confirmation for every interaction
3. **Breathing Room**: Generous spacing to prevent overwhelm
4. **Playful Professionalism**: Serious learning with delightful micro-moments

## Typography System
- **Headings**: Inter (700) - Lesson titles, section headers
- **Body**: Inter (400, 500) - Questions, explanations, cards
- **Code/Technical**: JetBrains Mono (400) - AI concepts, examples
- Sizes: text-4xl (titles), text-2xl (questions), text-lg (body), text-sm (labels)

## Layout & Spacing
**Spacing Units**: Tailwind 3, 4, 6, 8, 12, 16 for consistent rhythm
- Page padding: px-6 md:px-12
- Section spacing: space-y-8 to space-y-12
- Card spacing: p-6 md:p-8
- Max content width: max-w-4xl for learning content

## Component Library

### Learning Dashboard (Home)
- **Progress Overview**: Horizontal progress bar with milestone markers
- **Current Module Card**: Large featured card showing active lesson with continue button
- **Topic Grid**: 2x2 on desktop, stack on mobile - showing locked/unlocked states
- **Stats Bar**: Credits earned, streak counter, accuracy score in compact pills
- **Quick Access**: "Resume Learning" prominent, "Practice Mode" secondary

### Lesson Interface
- **Theory Section**: 
  - Max-width prose format (max-w-2xl)
  - Illustrative diagrams/visual aids embedded inline
  - Collapsible "Deep Dive" accordions for advanced details
- **Question Cards**:
  - Full-width cards with generous padding
  - Scenario-based questions with real-world context boxes
  - Multiple choice as large, clickable cards (not radio buttons)
  - Interactive code examples with syntax highlighting
  - Immediate visual feedback on selection (checkmark/cross animations)

### Adaptive Pathway System
- **Branching Indicator**: Visual tree showing current position and upcoming paths
- **Difficulty Badge**: Small pill showing current level (Beginner/Intermediate/Advanced)
- **Topic Suggestions**: "Based on your answers, we suggest..." card with reasoning

### Gamification Elements
- **Credit Counter**: Fixed top-right position with subtle pulse on earning
- **Achievement Toasts**: Bottom-right notifications for milestones
- **Streak Calendar**: Minimal heat-map style grid (7 days visible)
- **Progress Rings**: Circular progress for module completion

### Navigation
- **Sidebar** (Desktop): Collapsed by default, expandable with icons
  - Home, Active Lessons, Progress, Profile
  - Credits display at bottom
- **Bottom Nav** (Mobile): Fixed 4-icon navigation
- **Top Bar**: Lesson title (when in lesson), exit button, progress indicator

## Interaction Patterns
- **Card Selection**: Hover lift (translate-y-1), selected state with border emphasis
- **Question Flow**: Slide transitions between questions (left/right)
- **Answer Reveal**: Expand explanation panel below question after selection
- **Module Unlock**: Confetti animation (very brief, 1s max)

## Images
- **Hero Dashboard**: Isometric illustration of AI neural network - abstract, modern, friendly (top of dashboard)
- **Lesson Illustrations**: Small inline diagrams/icons for concepts (200x200px cards)
- **Scenario Cards**: Contextual imagery for real-world examples (4:3 aspect ratio)
- **Empty States**: Friendly illustrations for "No active lessons"

## Key Layout Patterns
- **Dashboard**: Single column flow with featured card + grid below
- **Lesson View**: Sidebar progress tree (desktop) + centered content column
- **Question Cards**: Full-width mobile, max-w-3xl desktop, centered
- **Results Screen**: Centered card with radial progress + breakdown grid

## Unique Experience Elements
1. **Learning Path Visualization**: Visual tree/flowchart showing completed nodes and available paths
2. **Contextual Hints**: Inline expandable helper text (not tooltips)
3. **Practice Sandbox**: Interactive playground for testing AI concepts
4. **Smart Pause**: "Take a break" suggestion after 25 minutes with mini meditation timer

This creates an engaging, non-overwhelming learning experience where users focus on one concept at a time while maintaining clear progress awareness.