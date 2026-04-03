import type { 
  User, InsertUser, Module, Lesson, Question, UserProgress 
} from "@shared/schema";
import { randomUUID } from "crypto";
import { DatabaseStorage } from "./db-storage";

type LearningCard = {
  id: string;
  type: "concept" | "example" | "question";
  topicId: string;
  topic: string;
  difficulty: string;
  lessonIndex: number;
  stepInLesson: number;
  concept?: {
    title: string;
    content: string;
    keyTakeaway: string;
  };
  example?: {
    title: string;
    scenario: string;
    explanation: string;
    realWorldApplication: string;
  };
  question?: Question;
};

type TopicDefinition = {
  id: string;
  title: string;
  description: string;
  audience: "all" | "developer" | "product-owner";
  order: number;
};

type AnswerHistory = {
  questionId: string;
  lessonIndex: number;
  isCorrect: boolean;
  answeredAt: Date;
  reviewCount: number;
};

type ReviewSession = {
  entries: Array<{ questionId: string; lessonIndex: number }>;
  cursor: number;
  startedAt: Date | null;
};

type DailyMission = {
  id: string;
  type: "answer_correct" | "complete_lessons" | "earn_credits" | "maintain_streak";
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
};

type TopicInfo = {
  id: string;
  title: string;
  description: string;
  audience: "all" | "developer" | "product-owner";
  lessonCount: number;
  completedLessons: number;
  isLocked: boolean;
  unlocksAt: Date | null;
};

type TopicProgress = {
  topicId: string;
  completedLessonIndices: number[];
  completedAt: Date | null;
};

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(id: string, credits: number): Promise<void>;
  updateUserStats(id: string, correct: boolean): Promise<void>;
  updateUserLevel(id: string, level: string): Promise<void>;
  updateUserStreak(id: string, streak: number): Promise<void>;
  
  getModules(): Promise<Module[]>;
  getModule(id: string): Promise<Module | undefined>;
  
  getLessons(moduleId: string): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | undefined>;
  
  getQuestions(lessonId: string): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  
  getUserProgress(lessonId: string): Promise<UserProgress | undefined>;
  completeLesson(lessonId: string, moduleId: string, correctAnswers: number, totalQuestions: number): Promise<void>;
  getCompletedLessonIds(): Promise<string[]>;
}

export class MemStorage implements IStorage {
  protected users: Map<string, User>;
  private modules: Map<string, Module>;
  private lessons: Map<string, Lesson>;
  private questions: Map<string, Question>;
  private userProgress: Map<string, UserProgress>;
  protected defaultUserId: string;
  
  private learningCards: LearningCard[];
  private currentCardIndex: number;
  private completedCardIds: Set<string>;
  private topics: TopicDefinition[];
  
  private answerHistory: AnswerHistory[];
  private dailyMissions: DailyMission[];
  private lastMissionReset: Date;
  private reviewSession: ReviewSession;
  private todayCreditsEarned: number;
  private todayLessonsCompleted: number;
  private topicProgress: Map<string, TopicProgress>;
  private topicUnlockDates: Map<string, Date>;

  constructor() {
    this.users = new Map();
    this.modules = new Map();
    this.lessons = new Map();
    this.questions = new Map();
    this.userProgress = new Map();
    this.learningCards = [];
    this.currentCardIndex = 0;
    this.completedCardIds = new Set();
    this.topics = [];
    
    this.answerHistory = [];
    this.dailyMissions = [];
    this.lastMissionReset = new Date();
    this.reviewSession = { entries: [], cursor: 0, startedAt: null };
    this.todayCreditsEarned = 0;
    this.todayLessonsCompleted = 0;
    this.topicProgress = new Map();
    this.topicUnlockDates = new Map();
    
    this.defaultUserId = randomUUID();
    this.initializeData();
  }

  private initializeData() {
    const defaultUser: User = {
      id: this.defaultUserId,
      username: "Learner",
      credits: 0,
      streak: 1,
      totalCorrect: 0,
      totalAnswered: 0,
      currentLevel: "beginner",
      startDate: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);

    this.initializeLearningCards();
  }

  private initializeLearningCards() {
    const lessons: Array<{
      topic: string;
      difficulty: string;
      concept: { title: string; content: string; keyTakeaway: string };
      example: { title: string; scenario: string; explanation: string; realWorldApplication: string };
      question: Omit<Question, "id" | "lessonId">;
    }> = [
      {
        topic: "AI Agents",
        difficulty: "beginner",
        concept: {
          title: "What is an AI Agent?",
          content: `An AI Agent is a system that uses AI models and tools in a loop to achieve a goal. Think of it as a smart assistant that can reason, take action, and learn from results.

Unlike a simple chatbot that just responds to messages, an agent can actually DO things - search the web, write code, call APIs, and more. It keeps working until it accomplishes what you asked for.

The key insight: Agents = Models + Tools + Loop. The AI model (like GPT or Claude) provides the "thinking," tools provide the "doing," and the loop keeps everything moving toward the goal.`,
          keyTakeaway: "An AI Agent runs models and tools in a loop to achieve a goal - it thinks, acts, and iterates until done.",
        },
        example: {
          title: "AI Agent in Action: The Smart Research Assistant",
          scenario: "Imagine you ask an AI: 'Find me the top 3 trending AI startups this week and summarize what they do.'",
          explanation: `Here's how an AI Agent handles this differently than a chatbot:

A chatbot might say: "I don't have real-time data" or give you outdated information.

An AI Agent would:
1. THINK: "I need current data, so I'll search the web"
2. ACT: Uses a search tool to find recent AI startup news
3. OBSERVE: Gets results from TechCrunch, VentureBeat
4. THINK: "Now I need to extract the top 3 and summarize"
5. ACT: Reads the articles and synthesizes information
6. DELIVER: Gives you a fresh, accurate summary

The agent loops through think-act-observe until the job is done!`,
          realWorldApplication: "This is exactly how tools like Perplexity AI work - they don't just guess, they actively search and verify information before responding.",
        },
        question: {
          scenario: "A company wants to build a system that can automatically research competitors, analyze their products, and generate a summary report.",
          question: "What makes this an AI Agent rather than a simple chatbot?",
          options: [
            "It uses a large language model",
            "It can search the web and use tools in a loop to complete the task",
            "It responds to user messages",
            "It has a nice user interface"
          ],
          correctIndex: 1,
          explanation: "The key difference is that an agent uses tools (web search, analysis) in a loop to accomplish a multi-step goal. A chatbot just responds to messages - an agent actually takes action and iterates until the task is complete.",
          difficulty: "beginner",
          creditsReward: 10,
        },
      },
      {
        topic: "ReAct Pattern",
        difficulty: "beginner",
        concept: {
          title: "The ReAct Pattern: Think, Act, Observe",
          content: `The ReAct pattern is the foundation of how modern AI agents work. It stands for Reasoning + Acting, and it's elegantly simple:

1. THOUGHT: The agent reasons about what to do next ("I need to find nearby restaurants, so I'll use the map function")

2. ACTION: The agent executes the step (calls the maps API)

3. OBSERVATION: The agent processes the results ("There are two pizza places and one Indian restaurant")

Then it loops back to THOUGHT, deciding what to do with this new information. This "chain-of-thought" approach dramatically improves AI performance by making the model explain its reasoning before acting.`,
          keyTakeaway: "ReAct = Think, Act, Observe, Repeat. This loop lets agents break down complex tasks into manageable steps.",
        },
        example: {
          title: "ReAct in Real Life: Booking a Flight",
          scenario: "You tell an AI travel agent: 'Book me the cheapest flight to Tokyo next month.'",
          explanation: `Watch the ReAct pattern unfold:

THOUGHT 1: "I need to know the user's departure city and exact dates"
ACTION 1: Ask user for departure location and flexible dates
OBSERVATION 1: User says "From NYC, any weekend"

THOUGHT 2: "I should search multiple weekends to find the best deal"
ACTION 2: Query flight APIs for 4 different weekend combinations
OBSERVATION 2: Found prices ranging from $650 to $1,200

THOUGHT 3: "March 15-17 is cheapest. I should confirm before booking"
ACTION 3: Present option to user with flight details
OBSERVATION 3: User approves

THOUGHT 4: "Time to complete the booking"
ACTION 4: Execute booking through airline API

Each step builds on the last - that's the power of ReAct!`,
          realWorldApplication: "Google's travel search and booking assistants use this pattern to help millions of users find the best deals every day.",
        },
        question: {
          scenario: "You're building an AI travel assistant. A user asks: 'Plan me a weekend trip to Paris with good food and art museums.'",
          question: "Following the ReAct pattern, what should happen FIRST?",
          options: [
            "Immediately book the cheapest flight",
            "The agent thinks about what information it needs (flights, museums, restaurants)",
            "Show the user a form to fill out",
            "Display a list of all Paris hotels"
          ],
          correctIndex: 1,
          explanation: "In ReAct, THOUGHT comes first. The agent needs to reason about the task - what are the sub-goals? What information is needed? Only after thinking does it take action. Jumping straight to booking would miss important considerations like dates, budget, and preferences.",
          difficulty: "beginner",
          creditsReward: 10,
        },
      },
      {
        topic: "Tools & APIs",
        difficulty: "beginner",
        concept: {
          title: "Tools: Extending What AI Can Do",
          content: `AI models are great at thinking and generating text, but they can't actually DO things on their own. That's where tools come in.

Tools are functions that let agents interact with the real world:
- Search the web for current information
- Query databases for specific data
- Call APIs to send emails or create tasks
- Execute code to perform calculations
- Control browsers to navigate websites

When you give an agent access to tools, you're essentially giving it hands to act in the world. The model decides WHEN to use a tool and WHAT inputs to provide - but the tool does the actual work.

The more tools an agent has, the more capable it becomes. But with great power comes great responsibility - you need guardrails!`,
          keyTakeaway: "Tools give AI agents the ability to act in the world - from searching to sending emails to executing code.",
        },
        example: {
          title: "Tools in Action: The AI Data Analyst",
          scenario: "A marketing manager asks: 'Analyze our Q4 sales data and create a presentation for the board meeting.'",
          explanation: `The AI agent orchestrates multiple tools:

DATABASE TOOL: Queries the sales database
"SELECT product, revenue, region FROM sales WHERE quarter = 'Q4'"

CALCULATOR TOOL: Performs analysis
- Calculates growth rates, top performers, regional breakdowns
- Identifies trends and anomalies

CHART GENERATOR: Creates visualizations
- Revenue by product (bar chart)
- Regional comparison (pie chart)
- Month-over-month trend (line graph)

SLIDES TOOL: Builds the presentation
- Arranges data into executive summary
- Adds key insights and recommendations

The AI doesn't do any of this itself - it's the conductor, and the tools are the orchestra!`,
          realWorldApplication: "Microsoft Copilot uses this exact approach - connecting to Excel, PowerPoint, and databases to help knowledge workers automate complex tasks.",
        },
        question: {
          scenario: "You're building an AI agent to help with data analysis. Users want it to query databases, create charts, and send results via email.",
          question: "Which tools does this agent need?",
          options: [
            "Just a large language model is enough",
            "Database query tool, charting/visualization tool, and email sending tool",
            "Only a database tool - the AI can do the rest",
            "No tools - modern AI can do all this natively"
          ],
          correctIndex: 1,
          explanation: "AI models can reason about data but can't directly query databases, generate actual charts, or send emails. Each capability requires a specific tool. The model orchestrates WHEN and HOW to use each tool, but the tools do the actual work.",
          difficulty: "beginner",
          creditsReward: 10,
        },
      },
      {
        topic: "Agent Memory",
        difficulty: "intermediate",
        concept: {
          title: "Memory Systems: Short-term vs Long-term",
          content: `Agents need memory to work effectively. But here's the catch: you can't just dump everything into the AI's context window. Too much information can confuse the model.

Short-term Memory holds the current conversation and immediate context. It's like your working memory - what you're actively thinking about right now.

Long-term Memory persists across sessions. It includes:
- User preferences and history
- Knowledge bases and documents
- Previous conversation summaries

Smart agents use techniques like vector search to find relevant memories instead of loading everything at once. Think of it like how you don't remember every book you've read, but you can recall relevant information when you need it.`,
          keyTakeaway: "Effective agents balance short-term context with selective retrieval from long-term memory - just like humans do.",
        },
        example: {
          title: "Memory in Action: The Personal Shopping Assistant",
          scenario: "A customer returns to an e-commerce site after 2 months and says: 'I need another pair of those running shoes I bought.'",
          explanation: `How memory makes this interaction magical:

WITHOUT MEMORY:
"I'm sorry, I don't know what shoes you bought. Can you describe them or provide an order number?"
(Frustrating for the customer!)

WITH SMART MEMORY:
The agent uses vector search on the customer's history:
- Query: "running shoes purchase"
- Retrieved: Order #4521 - Nike Air Zoom, Size 10, Blue, $129

Agent response: "I found your Nike Air Zoom Pegasus in size 10! Would you like the same blue color, or try the new colorways? I also noticed you mentioned they were great for marathon training - we have a newer model optimized for long distances."

The agent pulled relevant history AND added personalized recommendations!`,
          realWorldApplication: "Amazon's recommendation engine and customer service bots use exactly this pattern - retrieving relevant purchase history and preferences to personalize every interaction.",
        },
        question: {
          scenario: "An AI customer service agent needs to help a returning customer who had issues with a product 3 months ago.",
          question: "How should the agent handle this customer's history?",
          options: [
            "Load all customer emails from the past year into the context",
            "Start fresh with no memory of past interactions",
            "Use vector search to retrieve only relevant past interactions",
            "Ask the customer to explain everything from the beginning"
          ],
          correctIndex: 2,
          explanation: "Vector search retrieves semantically relevant memories without overloading context. Loading everything would confuse the model and be slow. Starting fresh or asking the customer to repeat themselves creates a poor experience. Smart retrieval gives the agent just what it needs.",
          difficulty: "intermediate",
          creditsReward: 15,
        },
      },
      {
        topic: "Agent Architecture",
        difficulty: "intermediate",
        concept: {
          title: "Multi-Agent Systems",
          content: `Sometimes one agent isn't enough. Complex tasks benefit from multiple specialized agents working together.

Imagine building a software development agent. Instead of one agent doing everything, you might have:
- A Planner agent that breaks down requirements
- A Coder agent that writes implementation
- A Reviewer agent that checks for bugs
- A Tester agent that validates the code

This separation of concerns makes systems more reliable and easier to improve. Each agent can be optimized for its specific task.

Multi-agent architectures also enable debates and consensus - when agents disagree, they can work through differences just like a team of humans would.

Research shows multi-agent systems can improve performance by around 29% on complex benchmarks!`,
          keyTakeaway: "Multi-agent systems divide complex tasks among specialized agents, improving reliability and performance.",
        },
        example: {
          title: "Multi-Agent System: The AI Newsroom",
          scenario: "A media company wants to automatically produce high-quality news articles about breaking stories.",
          explanation: `Here's how a multi-agent newsroom works:

SCANNER AGENT (always watching)
- Monitors news wires, social media, official sources
- Flags breaking stories worth covering

RESEARCHER AGENT (digs deep)
- Gathers facts, finds primary sources
- Verifies claims against multiple sources
- Compiles background information

WRITER AGENT (crafts the story)
- Writes engaging, accurate copy
- Matches the publication's style guide
- Creates headlines and summaries

EDITOR AGENT (quality control)
- Checks for errors and bias
- Verifies facts one more time
- Ensures legal compliance

PUBLISHER AGENT (distribution)
- Formats for different platforms
- Schedules optimal posting times
- Manages social media promotion

Each agent is a specialist - together they outperform any single "do-everything" agent!`,
          realWorldApplication: "The Associated Press uses AI agents to write thousands of corporate earnings reports - specialized agents handle data extraction while others write the narrative.",
        },
        question: {
          scenario: "A company wants to automate their content creation pipeline: research topics, write articles, edit for quality, and publish.",
          question: "Why might a multi-agent approach work better than a single agent?",
          options: [
            "It's always faster to use multiple agents",
            "Each agent can specialize (researcher, writer, editor) and be optimized for its role",
            "Single agents are not capable of any of these tasks",
            "Multi-agent systems are simpler to build"
          ],
          correctIndex: 1,
          explanation: "Specialization is the key benefit. A researcher agent can be tuned for finding facts, a writer for engaging prose, an editor for catching errors. Each can use different prompts, tools, and even models. This division of labor matches how human teams work - and it produces better results.",
          difficulty: "intermediate",
          creditsReward: 15,
        },
      },
      {
        topic: "Agent Safety",
        difficulty: "intermediate",
        concept: {
          title: "Guardrails: Keeping Agents Safe",
          content: `Agents that can act in the world need guardrails. Without them, a well-intentioned agent might cause unintended harm.

Key safety principles:

1. Least Privilege: Only give agents the minimum tools and permissions they need. An agent that summarizes documents doesn't need database delete access.

2. Human-in-the-Loop: For high-stakes actions (financial transactions, sending external communications), require human approval before executing.

3. Session Isolation: Each agent session should be isolated so one compromised session can't affect others.

4. Audit Trails: Log every action so you can understand what happened and why.

5. Fail Safely: When something goes wrong, agents should stop and ask for help rather than guessing.

Building trustworthy agents isn't just about capability - it's about predictable, controlled behavior.`,
          keyTakeaway: "Safe agents use least privilege, human oversight for high-stakes actions, isolation, and comprehensive logging.",
        },
        example: {
          title: "Guardrails in Action: The Banking Assistant",
          scenario: "A bank deploys an AI agent to help customers with account management and transactions.",
          explanation: `Watch how guardrails protect everyone:

LEAST PRIVILEGE:
- Can view balance and recent transactions
- Can NOT access other customers' data
- Can NOT modify account settings without 2FA

HUMAN-IN-THE-LOOP:
- Small transfers (<$500): Agent can process automatically
- Large transfers (>$500): Requires human review
- International transfers: Always needs manager approval

SESSION ISOLATION:
- Each chat session runs in its own container
- One hacked session can't access others
- Session data wiped after 24 hours

AUDIT TRAIL:
- Every action logged with timestamp
- "Agent viewed balance for account ***4521"
- "Agent initiated transfer of $200 to saved payee"
- "Transfer approved by system (under threshold)"

When the agent encounters something suspicious:
"I notice this is a new payee in a foreign country. For your protection, I'm escalating this to a human specialist who will call you to verify."`,
          realWorldApplication: "Bank of America's Erica assistant and similar banking bots use exactly these guardrails to process millions of requests while maintaining security.",
        },
        question: {
          scenario: "An AI agent has access to a company's customer database and email system. A prompt injection attack tries to make it email customer data to an external address.",
          question: "Which guardrail would BEST prevent this attack?",
          options: [
            "Using a larger, smarter AI model",
            "Requiring human approval before sending any external emails",
            "Giving the agent more training data",
            "Making the agent work faster"
          ],
          correctIndex: 1,
          explanation: "Human-in-the-loop for high-stakes actions is the most effective guardrail here. Even if an attacker tricks the model, a human reviewer would catch the suspicious email before it's sent. Model size doesn't prevent prompt injection - proper controls do.",
          difficulty: "intermediate",
          creditsReward: 15,
        },
      },
      {
        topic: "Code Execution",
        difficulty: "advanced",
        concept: {
          title: "Code Interpreters: Agents That Code",
          content: `One of the most powerful tools an agent can have is the ability to write and execute code. This is called a Code Interpreter.

When an agent can run code, it can:
- Perform complex calculations and data transformations
- Analyze datasets and create visualizations
- Test hypotheses by running experiments
- Automate repetitive tasks with scripts

But running arbitrary code is dangerous! That's why code interpreters use sandboxed environments - isolated containers where code runs safely without access to the host system.

Modern approaches use microVMs (tiny virtual machines) that spin up in milliseconds, run the code, and are destroyed. Even if malicious code executes, it can't escape the sandbox.

This pattern powers tools like ChatGPT's Code Interpreter and many enterprise AI solutions.`,
          keyTakeaway: "Code interpreters let agents write and run code in secure sandboxes, enabling powerful data analysis and automation.",
        },
        example: {
          title: "Code Interpreter: The Data Detective",
          scenario: "A business analyst uploads a messy CSV file and asks: 'Find any unusual patterns in our sales data.'",
          explanation: `The code interpreter agent gets to work:

STEP 1: Understand the data
\`\`\`python
import pandas as pd
df = pd.read_csv('sales_data.csv')
print(df.head())
print(df.describe())
\`\`\`
"I see 50,000 rows with columns: date, product, quantity, price, region..."

STEP 2: Clean and prepare
\`\`\`python
df['date'] = pd.to_datetime(df['date'])
df['revenue'] = df['quantity'] * df['price']
df = df.dropna()
\`\`\`
"Cleaned the data, calculated revenue, removed 23 incomplete rows..."

STEP 3: Detect anomalies
\`\`\`python
from scipy import stats
z_scores = stats.zscore(df['revenue'])
anomalies = df[abs(z_scores) > 3]
\`\`\`
"Found 17 unusual transactions!"

STEP 4: Visualize
\`\`\`python
import matplotlib.pyplot as plt
# Creates a chart highlighting the anomalies
\`\`\`

RESULT: "I found 17 anomalous sales - 12 are unusually large orders from Region B on Fridays. This might indicate bulk purchasing by a large client. Here's a visualization..."

All this runs in a secure sandbox - the code can't access anything outside its container!`,
          realWorldApplication: "ChatGPT's Code Interpreter, GitHub Copilot, and Jupyter AI all use sandboxed code execution to let users safely analyze data without writing code themselves.",
        },
        question: {
          scenario: "An AI data analyst agent needs to process a large CSV file, find anomalies, and create a visualization. The agent writes Python code to do this.",
          question: "Why is sandboxed code execution critical for this use case?",
          options: [
            "It makes the code run faster",
            "The code might have bugs or be manipulated to access sensitive systems",
            "Python requires a sandbox to work",
            "It's just a best practice with no real benefit"
          ],
          correctIndex: 1,
          explanation: "Even well-intentioned code can have bugs, and prompt injection could trick the agent into writing malicious code. A sandbox ensures that whatever code runs can't access the host system, other users' data, or network resources it shouldn't have. It's a critical security boundary.",
          difficulty: "advanced",
          creditsReward: 20,
        },
      },
    ];

    this.topics = [
      { id: "ai-agents-fundamentals", title: "AI Agents Fundamentals", description: "Core concepts of AI agents", audience: "all", order: 1 },
      { id: "distributed-systems", title: "Distributed Systems", description: "SQL, NoSQL, and scalability", audience: "developer", order: 2 },
      { id: "ai-for-product-owners", title: "AI for Product Owners", description: "Strategic AI decisions", audience: "product-owner", order: 3 },
      { id: "genai-for-developers", title: "GenAI for Developers", description: "Building with AI APIs", audience: "developer", order: 4 },
    ];
    
    this.topicUnlockDates.set("ai-agents-fundamentals", new Date(0));

    const cards: Omit<LearningCard, "id">[] = [];
    lessons.forEach((lesson, lessonIndex) => {
      const topicId = "ai-agents-fundamentals";
      cards.push({
        type: "concept",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 1,
        concept: lesson.concept,
      });
      cards.push({
        type: "example",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 2,
        example: lesson.example,
      });
      cards.push({
        type: "question",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 3,
        question: {
          id: randomUUID(),
          lessonId: "",
          ...lesson.question,
        },
      });
    });

    const productOwnerLessons = [
      {
        topic: "Evaluating AI Products",
        difficulty: "beginner",
        concept: {
          title: "How to Evaluate AI for Your Product",
          content: `Before adding AI to your product, ask three critical questions:

1. IS THIS A GOOD FIT FOR AI?
AI excels at: Pattern recognition, language understanding, prediction, personalization
AI struggles with: Precise calculations, guaranteed correctness, explaining its reasoning

2. WHAT'S THE COST OF BEING WRONG?
Low stakes: Recommendations, search, suggestions
High stakes: Medical diagnosis, financial decisions, legal advice
Rule: The higher the stakes, the more human oversight you need.

3. DO YOU HAVE THE DATA?
AI needs data to learn. If you're starting fresh, consider: Do you have enough examples? Is your data representative? How will you handle edge cases?`,
          keyTakeaway: "Good AI products match the technology to problems where being sometimes wrong is acceptable and data is available.",
        },
        example: {
          title: "AI Fit Analysis: E-commerce Search",
          scenario: "An e-commerce company wants to improve their search results using AI.",
          explanation: `Let's evaluate:

FIT CHECK:
- Pattern recognition? Yes - finding products from vague queries
- Language understanding? Yes - "blue running shoes for wet weather"
- Precise answers needed? No - showing relevant options is fine

COST OF WRONG:
- Low stakes - showing imperfect results just means users refine their search
- No safety concerns - worst case is a frustrated customer

DATA AVAILABLE?
- Years of search queries + clicks
- Purchase history
- Product descriptions and images

VERDICT: Excellent AI fit! This is why Amazon, Shopify, and every major e-commerce platform uses AI search.`,
          realWorldApplication: "Companies like Algolia and Elasticsearch now offer AI-powered search that understands intent, not just keywords.",
        },
        question: {
          scenario: "A hospital wants to use AI to automatically diagnose patients from their symptoms and prescribe medication without doctor review.",
          question: "Why is this a poor fit for current AI technology?",
          options: [
            "AI can't understand medical terminology",
            "High stakes decisions require human oversight, and AI can make confident-sounding errors",
            "Hospitals don't have enough data",
            "AI is too expensive for healthcare"
          ],
          correctIndex: 1,
          explanation: "Medical diagnosis is high-stakes - errors can harm patients. Current AI can hallucinate confidently, making it unsuitable for autonomous medical decisions. AI works well as a tool to assist doctors, not replace their judgment in critical decisions.",
          difficulty: "beginner",
          creditsReward: 10,
        },
      },
      {
        topic: "AI ROI & Buy vs Build",
        difficulty: "beginner",
        concept: {
          title: "Build vs Buy: Making Smart AI Investments",
          content: `Most companies should BUY AI capabilities, not build them. Here's why:

BUILD only if:
- AI is your core competitive advantage
- You have unique data no one else has
- You have an ML team with 12+ months runway
- You're solving a problem APIs can't handle

BUY (use APIs) when:
- Speed to market matters
- The capability is becoming commoditized
- You lack specialized ML talent
- You want predictable costs

THE HIDDEN COSTS OF BUILDING:
- Data labeling and cleaning (60% of ML project time)
- Model training and iteration
- Infrastructure and scaling
- Ongoing maintenance and monitoring
- Keeping up with rapidly evolving field`,
          keyTakeaway: "For 90% of companies, buying AI via APIs is faster, cheaper, and lets you focus on your actual product.",
        },
        example: {
          title: "Real Decision: Customer Support Chatbot",
          scenario: "A SaaS company with 50 employees wants to add AI chat support.",
          explanation: `BUY OPTION (Recommended):
- Use OpenAI API + simple prompt engineering
- Time to launch: 2-4 weeks
- Cost: $500-2000/month based on usage
- Maintenance: Minimal - update prompts occasionally

BUILD OPTION:
- Hire 2-3 ML engineers ($400K+/year)
- 6-12 months to first version
- Need to collect/label thousands of conversations
- Build training pipeline, hosting, monitoring
- Ongoing model updates as product changes

REALITY CHECK:
Even companies like Intercom and Zendesk - whose core business is customer support - use OpenAI's models. If they're buying, why would you build?`,
          realWorldApplication: "Stripe, Notion, and thousands of startups use OpenAI/Anthropic APIs rather than building custom models - letting them ship AI features in weeks, not years.",
        },
        question: {
          scenario: "A 20-person startup wants to add AI features to their note-taking app. They have $2M in funding and want to launch within 3 months.",
          question: "Should they build custom AI models or use existing APIs?",
          options: [
            "Build custom models for competitive advantage",
            "Use existing APIs - faster time to market and appropriate for their stage",
            "Wait for AI to mature before adding features",
            "Hire an ML team first, then decide"
          ],
          correctIndex: 1,
          explanation: "With limited funding and a 3-month timeline, APIs are the clear choice. Building custom models would consume their runway and delay launch by 6-12 months. Many successful companies like Notion ship with APIs and only consider custom models after proving product-market fit.",
          difficulty: "beginner",
          creditsReward: 10,
        },
      },
    ];

    const developerLessons = [
      {
        topic: "Prompt Engineering Basics",
        difficulty: "beginner",
        concept: {
          title: "Writing Effective Prompts",
          content: `Prompts are how you program AI models. Better prompts = better results.

THE CORE PATTERN:
1. ROLE: Tell the AI who to be
   "You are an expert code reviewer..."

2. TASK: Be specific about what you want
   "Review this code for security vulnerabilities"

3. CONTEXT: Provide relevant information
   "This is a Node.js API handling payment data"

4. FORMAT: Specify the output structure
   "List each issue with severity, line number, and fix"

COMMON MISTAKES:
- Being too vague ("make this better")
- Not providing examples
- Asking for too much at once
- Not specifying constraints`,
          keyTakeaway: "Good prompts have four parts: Role, Task, Context, and Format. The more specific you are, the better the output.",
        },
        example: {
          title: "Prompt Improvement: Code Review",
          scenario: "You want AI to review your code for issues.",
          explanation: `BAD PROMPT:
"Review this code"

BETTER PROMPT:
"You are a senior security engineer. Review this Node.js authentication code for:
1. SQL injection vulnerabilities
2. Password handling issues
3. Session management flaws

For each issue found, provide:
- Line number
- Severity (high/medium/low)
- Specific fix recommendation

Code:
[paste code here]"

WHY IT'S BETTER:
- Clear role (security engineer)
- Specific focus areas (3 types of issues)
- Defined output format
- Actionable deliverables`,
          realWorldApplication: "GitHub Copilot, Cursor, and other AI coding tools all use sophisticated prompts behind the scenes to give you relevant suggestions.",
        },
        question: {
          scenario: "You want an AI to help you write unit tests for a React component.",
          question: "Which prompt will give you the best results?",
          options: [
            "Write tests for this component",
            "You are a React testing expert. Write Jest tests for this UserProfile component that test: 1) rendering with valid props, 2) handling missing data, 3) click interactions. Use React Testing Library. Here's the component: [code]",
            "Make some tests",
            "I need help with testing"
          ],
          correctIndex: 1,
          explanation: "The detailed prompt specifies the role (React testing expert), exact requirements (3 test scenarios), technology (Jest + RTL), and provides the code. This gives the AI everything it needs to produce useful, specific tests.",
          difficulty: "beginner",
          creditsReward: 10,
        },
      },
      {
        topic: "Working with AI APIs",
        difficulty: "beginner",
        concept: {
          title: "Integrating AI APIs: Best Practices",
          content: `Calling AI APIs seems simple, but production usage requires careful design.

ESSENTIAL PATTERNS:

1. HANDLE FAILURES GRACEFULLY
AI APIs can timeout, rate limit, or return errors. Always have a fallback.

2. MANAGE COSTS
Set usage limits, cache responses, use cheaper models for simple tasks.

3. STREAM FOR UX
Long responses should stream token-by-token so users see progress.

4. LOG EVERYTHING
Store prompts, responses, and latency. You'll need this for debugging and improvement.

5. VALIDATE OUTPUTS
AI can return unexpected formats. Parse and validate before using.

COST OPTIMIZATION:
- GPT-4: ~$30/million tokens (powerful)
- GPT-3.5: ~$0.50/million tokens (fast, cheap)
- Use 3.5 for simple tasks, 4 for complex reasoning`,
          keyTakeaway: "Production AI requires error handling, cost management, streaming, logging, and output validation - not just API calls.",
        },
        example: {
          title: "Production-Ready AI Integration",
          scenario: "Building a feature that summarizes long documents.",
          explanation: `NAIVE APPROACH:
const summary = await openai.chat({
  model: "gpt-4",
  messages: [{role: "user", content: doc}]
});

PRODUCTION APPROACH:
1. Check document length - split if too long
2. Use streaming for immediate feedback
3. Add timeout and retry logic
4. Cache summaries to avoid re-processing
5. Log request/response for debugging
6. Validate response has expected format
7. Use gpt-3.5-turbo for short docs (cheaper)
8. Set user-level rate limits

The naive version works in demos. The production version works at scale without bankrupting you or frustrating users.`,
          realWorldApplication: "Companies like Notion and Jasper process millions of AI requests daily using these patterns to keep costs manageable and reliability high.",
        },
        question: {
          scenario: "Your AI feature works in development but in production: API calls sometimes timeout, costs are higher than expected, and users complain about slow responses.",
          question: "What's the most impactful fix to implement first?",
          options: [
            "Upgrade to a more expensive API tier",
            "Add streaming, caching, and a fallback for failures",
            "Remove the AI feature entirely",
            "Ask users to be patient"
          ],
          correctIndex: 1,
          explanation: "Streaming improves perceived speed, caching reduces costs and latency for repeat queries, and fallbacks ensure the app works even when the API fails. These are the production fundamentals that separate demos from real products.",
          difficulty: "beginner",
          creditsReward: 10,
        },
      },
    ];

    let lessonOffset = lessons.length;
    productOwnerLessons.forEach((lesson, idx) => {
      const topicId = "ai-for-product-owners";
      const lessonIndex = lessonOffset + idx;
      cards.push({
        type: "concept",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 1,
        concept: lesson.concept,
      });
      cards.push({
        type: "example",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 2,
        example: lesson.example,
      });
      cards.push({
        type: "question",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 3,
        question: {
          id: randomUUID(),
          lessonId: "",
          ...lesson.question,
        },
      });
    });

    const distributedSystemsLessons = [
      {
        topic: "SQL vs NoSQL",
        difficulty: "beginner",
        concept: {
          title: "Choosing Between SQL and NoSQL",
          content: `The database you choose shapes your entire system. Here's when to use each:

SQL (Relational) databases:
- Strong consistency and ACID transactions
- Complex queries with JOINs
- Structured data with relationships
- Examples: PostgreSQL, MySQL

NoSQL databases:
- Flexible schemas
- Horizontal scaling
- High write throughput
- Examples: MongoDB, DynamoDB, Redis

THE KEY INSIGHT: It's not about which is "better" - it's about your access patterns. How will you read and write data? That determines everything.`,
          keyTakeaway: "Choose your database based on access patterns: SQL for complex queries and transactions, NoSQL for scale and flexibility.",
        },
        example: {
          title: "Real Decision: E-commerce Platform",
          scenario: "Building an e-commerce platform that needs to handle product catalog, user orders, and real-time inventory.",
          explanation: `PRODUCT CATALOG → NoSQL (MongoDB/DynamoDB)
- Products have varying attributes (shoes have sizes, laptops have specs)
- Read-heavy, needs caching
- Flexible schema for different product types

USER ORDERS → SQL (PostgreSQL)
- Transactions must be ACID (no double-charging!)
- Complex queries: "orders by user in date range"
- Relationships: orders → items → products

INVENTORY → Redis
- Real-time stock counts
- High write throughput (decrement on purchase)
- Eventually consistent is OK for display

VERDICT: Most real systems use MULTIPLE databases, each optimized for its use case.`,
          realWorldApplication: "Amazon uses DynamoDB for catalog, Aurora for transactions, and ElastiCache for sessions - proving polyglot persistence is the norm at scale.",
        },
        question: {
          scenario: "You're building a social media app with user profiles, posts, and a feed. Posts can have comments, likes, and shares.",
          question: "Which database strategy makes the most sense?",
          options: [
            "Only SQL - social graphs need relationships",
            "Only NoSQL - social apps need to scale",
            "SQL for user accounts and transactions, NoSQL for posts and feeds",
            "File-based storage for simplicity"
          ],
          correctIndex: 2,
          explanation: "User accounts need ACID properties (password changes, email verification). But posts and feeds are read-heavy and need horizontal scaling. Facebook, Twitter, and Instagram all use polyglot persistence - SQL for critical user data, NoSQL for content and feeds.",
          difficulty: "beginner",
          creditsReward: 10,
        },
      },
      {
        topic: "CAP Theorem",
        difficulty: "intermediate",
        concept: {
          title: "CAP Theorem: The Fundamental Trade-off",
          content: `In distributed systems, you can only guarantee TWO of three properties:

C - Consistency: Every read gets the most recent write
A - Availability: Every request gets a response
P - Partition Tolerance: System works despite network failures

Since network partitions WILL happen, you're really choosing between:
- CP: Consistent but may reject requests during partitions (banking)
- AP: Available but may return stale data (social media feeds)

This isn't a one-time choice - different parts of your system can make different trade-offs!`,
          keyTakeaway: "CAP forces a choice: during network issues, do you want correct data (CP) or any response (AP)? Choose based on business impact.",
        },
        example: {
          title: "CAP in Action: Banking vs Social Media",
          scenario: "Compare how a bank and Twitter handle the same network partition.",
          explanation: `BANK TRANSFER DURING PARTITION:
Choosing CP (Consistency + Partition Tolerance)
- User tries to transfer $500
- System can't confirm account balance
- RESULT: "Transaction temporarily unavailable"
- WHY: Wrong balance could mean overdraft or lost money

TWITTER DURING PARTITION:
Choosing AP (Availability + Partition Tolerance)
- User views their timeline
- Some tweets might be slightly stale
- RESULT: Shows cached timeline from 30 seconds ago
- WHY: Stale tweets are fine, unavailable Twitter is not

SAME TECHNOLOGY, DIFFERENT CHOICES:
Even within one company, checkout is CP while product browsing is AP.`,
          realWorldApplication: "DynamoDB offers both: strongly consistent reads (CP) or eventually consistent reads (AP) - you choose per-request based on what you're doing.",
        },
        question: {
          scenario: "Your system has a leader election feature that decides which server handles writes. During a network partition, two servers both think they're the leader.",
          question: "What is this problem called and how do you solve it?",
          options: [
            "Split brain - use consensus algorithms like Raft or require majority quorum",
            "Race condition - add mutex locks",
            "Deadlock - implement timeout mechanisms",
            "Memory leak - restart the servers"
          ],
          correctIndex: 0,
          explanation: "Split brain occurs when network partitions cause multiple nodes to assume leadership. Consensus algorithms like Raft and Paxos solve this by requiring a majority quorum - if you can't reach majority, you can't become leader. This is why distributed systems often have odd numbers of nodes.",
          difficulty: "intermediate",
          creditsReward: 15,
        },
      },
      {
        topic: "Scaling Patterns",
        difficulty: "intermediate",
        concept: {
          title: "Horizontal vs Vertical Scaling",
          content: `VERTICAL SCALING (Scale Up):
- Bigger machine: more CPU, RAM, SSD
- Simple but limited - can't scale infinitely
- Good for: databases, monoliths in early stage

HORIZONTAL SCALING (Scale Out):
- More machines working together
- Complex but unlimited potential
- Requires: load balancing, state management, coordination

THE REALITY: Most systems use both. Scale up until it's expensive, then scale out for critical paths.

KEY PATTERNS:
- Stateless services → easy to scale horizontally
- Stateful services → harder, need sharding or replication
- Databases → read replicas, sharding, or managed services`,
          keyTakeaway: "Scale up for simplicity, scale out for growth. Make services stateless when possible - they're much easier to scale.",
        },
        example: {
          title: "Scaling a Growing Startup",
          scenario: "Your app went viral. You have 10x traffic and 2 seconds response time (was 200ms).",
          explanation: `STAGE 1: QUICK WINS
- Add Redis cache → 50% of requests never hit DB
- Enable CDN → static assets served from edge
- Result: 1 second response time

STAGE 2: VERTICAL SCALE
- Upgrade database: 4 cores → 16 cores
- More RAM: 16GB → 64GB (more fits in memory)
- Result: 400ms response time

STAGE 3: HORIZONTAL SCALE
- Add read replicas for database
- Run 4 app servers behind load balancer
- Result: 150ms response time, handles 50x original traffic

STAGE 4: ARCHITECTURE CHANGES
- Split monolith into services
- Async processing with queues
- Result: 100ms at any scale

Each stage buys time. Don't over-engineer early!`,
          realWorldApplication: "Shopify scaled from one server to handling millions of stores using this exact progression - caching first, then read replicas, then sharding.",
        },
        question: {
          scenario: "Your database is the bottleneck. Reads are 10x more frequent than writes. Response times are degrading.",
          question: "What's the most effective first step?",
          options: [
            "Immediately shard the database across multiple servers",
            "Add read replicas and route read queries to them",
            "Rewrite the application in a faster programming language",
            "Switch from SQL to NoSQL"
          ],
          correctIndex: 1,
          explanation: "Read replicas are the standard solution for read-heavy workloads. They're much simpler than sharding (which splits data) and don't require application changes for NoSQL migration. Most databases support replicas natively, and you can add them without downtime.",
          difficulty: "intermediate",
          creditsReward: 15,
        },
      },
    ];

    lessonOffset += productOwnerLessons.length;
    distributedSystemsLessons.forEach((lesson, idx) => {
      const topicId = "distributed-systems";
      const lessonIndex = lessonOffset + idx;
      cards.push({
        type: "concept",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 1,
        concept: lesson.concept,
      });
      cards.push({
        type: "example",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 2,
        example: lesson.example,
      });
      cards.push({
        type: "question",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 3,
        question: {
          id: randomUUID(),
          lessonId: "",
          ...lesson.question,
        },
      });
    });

    lessonOffset += distributedSystemsLessons.length;
    developerLessons.forEach((lesson, idx) => {
      const topicId = "genai-for-developers";
      const lessonIndex = lessonOffset + idx;
      cards.push({
        type: "concept",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 1,
        concept: lesson.concept,
      });
      cards.push({
        type: "example",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 2,
        example: lesson.example,
      });
      cards.push({
        type: "question",
        topicId,
        topic: lesson.topic,
        difficulty: lesson.difficulty,
        lessonIndex,
        stepInLesson: 3,
        question: {
          id: randomUUID(),
          lessonId: "",
          ...lesson.question,
        },
      });
    });

    this.learningCards = cards.map(card => ({
      ...card,
      id: randomUUID(),
    }));

    const modulesData: Omit<Module, "id">[] = [
      {
        title: "AI Agents Fundamentals",
        description: "Understanding what AI agents are and how they work.",
        icon: "bot",
        order: 1,
        isLocked: false,
      },
    ];

    modulesData.forEach((mod) => {
      const id = randomUUID();
      this.modules.set(id, { ...mod, id });
    });
  }

  async getCurrentLearningCard(): Promise<LearningCard | null> {
    const now = new Date();
    const user = await this.getDefaultUser();
    
    for (let i = this.currentCardIndex; i < this.learningCards.length; i++) {
      const card = this.learningCards[i];
      
      const topicUnlockDate = this.topicUnlockDates.get(card.topicId);
      if (!topicUnlockDate || topicUnlockDate > now) {
        continue;
      }
      
      if (this.completedCardIds.has(card.id)) {
        continue;
      }
      
      if (card.difficulty === "advanced" && user.currentLevel === "beginner") {
        continue;
      }
      
      if (card.difficulty === "intermediate" && user.currentLevel === "beginner" && user.totalCorrect < 3) {
        continue;
      }
      
      this.currentCardIndex = i;
      return card;
    }
    
    return null;
  }

  async advanceToNextCard(): Promise<void> {
    if (this.reviewSession.startedAt !== null) {
      this.reviewSession.cursor++;
      if (this.reviewSession.cursor >= this.reviewSession.entries.length) {
        this.reviewSession = { entries: [], cursor: 0, startedAt: null };
      }
      return;
    }
    
    const currentCard = await this.getCurrentLearningCard();
    if (currentCard) {
      this.completedCardIds.add(currentCard.id);
      
      if (currentCard.type === "question") {
        this.updateMissionProgress("complete_lessons", 1);
        await this.completeTopicLesson(currentCard.topicId);
      }
    }
    
    this.currentCardIndex++;
    
    const user = await this.getDefaultUser();
    const accuracy = user.totalAnswered > 0 
      ? (user.totalCorrect / user.totalAnswered) * 100 
      : 0;
    
    if (accuracy >= 80 && user.currentLevel === "beginner" && user.totalAnswered >= 3) {
      await this.updateUserLevel(user.id, "intermediate");
    } else if (accuracy >= 90 && user.currentLevel === "intermediate" && user.totalAnswered >= 6) {
      await this.updateUserLevel(user.id, "advanced");
    }
  }

  async getTodayProgress(): Promise<number> {
    return this.completedCardIds.size;
  }

  async getTotalCards(): Promise<number> {
    return this.learningCards.length;
  }

  async getTopics(): Promise<TopicInfo[]> {
    const now = new Date();
    return this.topics.map(topic => {
      const topicCards = this.learningCards.filter(c => c.topicId === topic.id);
      const questionCards = topicCards.filter(c => c.type === "question");
      const completedQuestions = questionCards.filter(c => this.completedCardIds.has(c.id));
      
      const unlockDate = this.topicUnlockDates.get(topic.id);
      const isLocked = !unlockDate || unlockDate > now;
      
      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        audience: topic.audience,
        lessonCount: questionCards.length,
        completedLessons: completedQuestions.length,
        isLocked,
        unlocksAt: isLocked ? unlockDate || null : null,
      };
    });
  }

  async completeTopicLesson(topicId: string): Promise<void> {
    const topicCards = this.learningCards.filter(c => c.topicId === topicId && c.type === "question");
    const completedCount = topicCards.filter(c => this.completedCardIds.has(c.id)).length;
    
    if (completedCount >= topicCards.length) {
      const topic = this.topics.find(t => t.id === topicId);
      if (topic) {
        const nextTopic = this.topics.find(t => t.order === topic.order + 1);
        if (nextTopic && !this.topicUnlockDates.has(nextTopic.id)) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          this.topicUnlockDates.set(nextTopic.id, tomorrow);
        }
      }
    }
  }

  async getCurrentTopicId(): Promise<string | null> {
    const currentCard = await this.getCurrentLearningCard();
    return currentCard?.topicId || null;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getDefaultUser(): Promise<User> {
    return this.users.get(this.defaultUserId)!;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id,
      username: insertUser.username,
      credits: 0,
      streak: 0,
      totalCorrect: 0,
      totalAnswered: 0,
      currentLevel: "beginner",
      startDate: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserCredits(id: string, creditsToAdd: number): Promise<void> {
    const user = this.users.get(this.defaultUserId);
    if (user) {
      user.credits += creditsToAdd;
    }
  }

  async updateUserStats(id: string, correct: boolean): Promise<void> {
    const user = this.users.get(this.defaultUserId);
    if (user) {
      user.totalAnswered += 1;
      if (correct) {
        user.totalCorrect += 1;
      }
    }
  }

  async updateUserLevel(id: string, level: string): Promise<void> {
    const user = this.users.get(this.defaultUserId);
    if (user) {
      user.currentLevel = level;
    }
  }

  async updateUserStreak(id: string, streak: number): Promise<void> {
    const user = this.users.get(this.defaultUserId);
    if (user) {
      user.streak = streak;
    }
  }

  async updateUsername(id: string, username: string): Promise<void> {
    const user = this.users.get(this.defaultUserId);
    if (user) {
      user.username = username;
    }
  }

  async getModules(): Promise<Module[]> {
    return Array.from(this.modules.values()).sort((a, b) => a.order - b.order);
  }

  async getModule(id: string): Promise<Module | undefined> {
    return this.modules.get(id);
  }

  async getLessons(moduleId: string): Promise<Lesson[]> {
    return Array.from(this.lessons.values())
      .filter((lesson) => lesson.moduleId === moduleId)
      .sort((a, b) => a.order - b.order);
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async getQuestions(lessonId: string): Promise<Question[]> {
    return Array.from(this.questions.values())
      .filter((question) => question.lessonId === lessonId);
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async getUserProgress(lessonId: string): Promise<UserProgress | undefined> {
    return this.userProgress.get(lessonId);
  }

  async completeLesson(lessonId: string, moduleId: string, correctAnswers: number, totalQuestions: number): Promise<void> {
    const id = randomUUID();
    this.userProgress.set(lessonId, {
      id,
      moduleId,
      lessonId,
      completed: true,
      correctAnswers,
      totalQuestions,
    });
  }

  async getCompletedLessonIds(): Promise<string[]> {
    return Array.from(this.userProgress.values())
      .filter(p => p.completed)
      .map(p => p.lessonId);
  }

  async getFirstUncompletedLesson(): Promise<{ lesson: Lesson; module: Module } | null> {
    const completedIds = await this.getCompletedLessonIds();
    const modules = await this.getModules();
    
    for (const module of modules) {
      if (module.isLocked) continue;
      
      const lessons = await this.getLessons(module.id);
      for (const lesson of lessons) {
        if (!completedIds.includes(lesson.id)) {
          return { lesson, module };
        }
      }
    }
    return null;
  }

  async getNextLesson(currentLessonId: string): Promise<Lesson | null> {
    const currentLesson = await this.getLesson(currentLessonId);
    if (!currentLesson) return null;

    const moduleLessons = await this.getLessons(currentLesson.moduleId);
    const currentIndex = moduleLessons.findIndex(l => l.id === currentLessonId);
    
    if (currentIndex < moduleLessons.length - 1) {
      return moduleLessons[currentIndex + 1];
    }

    const modules = await this.getModules();
    const currentModuleIndex = modules.findIndex(m => m.id === currentLesson.moduleId);
    
    if (currentModuleIndex < modules.length - 1) {
      const nextModule = modules[currentModuleIndex + 1];
      if (!nextModule.isLocked) {
        const nextModuleLessons = await this.getLessons(nextModule.id);
        return nextModuleLessons[0] || null;
      }
    }

    return null;
  }

  async recordAnswer(questionId: string, lessonIndex: number, isCorrect: boolean): Promise<void> {
    const existing = this.answerHistory.find(a => a.questionId === questionId);
    if (existing) {
      existing.isCorrect = isCorrect;
      existing.answeredAt = new Date();
      existing.reviewCount += 1;
    } else {
      this.answerHistory.push({
        questionId,
        lessonIndex,
        isCorrect,
        answeredAt: new Date(),
        reviewCount: 0,
      });
    }
    
    if (isCorrect) {
      this.updateMissionProgress("answer_correct", 1);
    }
  }

  async getReviewQuestions(): Promise<LearningCard[]> {
    const now = new Date();
    const reviewCards: LearningCard[] = [];
    
    for (const answer of this.answerHistory) {
      if (!answer.isCorrect) {
        const card = this.learningCards.find(
          c => c.type === "question" && c.lessonIndex === answer.lessonIndex
        );
        if (card) {
          reviewCards.push(card);
        }
      } else {
        const hoursSince = (now.getTime() - answer.answeredAt.getTime()) / (1000 * 60 * 60);
        const reviewIntervals = [24, 72, 168];
        const interval = reviewIntervals[Math.min(answer.reviewCount, reviewIntervals.length - 1)];
        
        if (hoursSince >= interval) {
          const card = this.learningCards.find(
            c => c.type === "question" && c.lessonIndex === answer.lessonIndex
          );
          if (card) {
            reviewCards.push(card);
          }
        }
      }
    }
    
    return reviewCards.slice(0, 5);
  }

  async startReviewMode(): Promise<void> {
    const reviewCandidates = await this.getReviewQuestions();
    if (reviewCandidates.length > 0) {
      this.reviewSession = {
        entries: reviewCandidates.map(card => ({
          questionId: card.question?.id || card.id,
          lessonIndex: card.lessonIndex,
        })),
        cursor: 0,
        startedAt: new Date(),
      };
    } else {
      this.reviewSession = { entries: [], cursor: 0, startedAt: null };
    }
  }

  async exitReviewMode(): Promise<void> {
    this.reviewSession = { entries: [], cursor: 0, startedAt: null };
  }

  async getIsInReviewMode(): Promise<boolean> {
    return this.reviewSession.startedAt !== null;
  }

  async getReviewSessionLength(): Promise<number> {
    return this.reviewSession.entries.length - this.reviewSession.cursor;
  }

  async getCurrentReviewCard(): Promise<LearningCard | null> {
    if (this.reviewSession.startedAt === null) {
      return null;
    }
    
    const entry = this.reviewSession.entries[this.reviewSession.cursor];
    if (!entry) {
      return null;
    }
    
    const card = this.learningCards.find(
      c => c.type === "question" && 
           c.lessonIndex === entry.lessonIndex && 
           c.question?.id === entry.questionId
    );
    
    if (card) {
      return card;
    }
    
    return this.learningCards.find(
      c => c.type === "question" && c.lessonIndex === entry.lessonIndex
    ) || null;
  }

  private generateDailyMissions(): void {
    const missionTemplates = [
      { type: "answer_correct" as const, title: "Quick Learner", description: "Answer 3 questions correctly", target: 3, reward: 15 },
      { type: "answer_correct" as const, title: "Knowledge Seeker", description: "Answer 5 questions correctly", target: 5, reward: 25 },
      { type: "complete_lessons" as const, title: "Lesson Master", description: "Complete 2 lessons", target: 2, reward: 20 },
      { type: "earn_credits" as const, title: "Credit Collector", description: "Earn 30 credits today", target: 30, reward: 15 },
    ];
    
    const shuffled = missionTemplates.sort(() => Math.random() - 0.5);
    this.dailyMissions = shuffled.slice(0, 3).map((template, i) => ({
      id: `mission-${i}`,
      ...template,
      current: 0,
      completed: false,
    }));
  }

  private getDateString(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  async getDailyMissions(): Promise<DailyMission[]> {
    const now = new Date();
    const todayString = this.getDateString(now);
    const lastResetString = this.getDateString(this.lastMissionReset);
    
    if (todayString !== lastResetString || this.dailyMissions.length === 0) {
      this.generateDailyMissions();
      this.lastMissionReset = now;
      this.todayCreditsEarned = 0;
      this.todayLessonsCompleted = 0;
    }
    
    return this.dailyMissions;
  }

  private updateMissionProgress(type: DailyMission["type"], amount: number): void {
    for (const mission of this.dailyMissions) {
      if (mission.type === type && !mission.completed) {
        mission.current = Math.min(mission.current + amount, mission.target);
        if (mission.current >= mission.target) {
          mission.completed = true;
          const user = this.users.get(this.defaultUserId);
          if (user) {
            user.credits += mission.reward;
          }
        }
      }
    }
  }

  async onCreditsEarned(amount: number): Promise<void> {
    this.todayCreditsEarned += amount;
    this.updateMissionProgress("earn_credits", amount);
  }

  async onLessonCompleted(): Promise<void> {
    this.todayLessonsCompleted += 1;
    this.updateMissionProgress("complete_lessons", 1);
  }

  async getDailyPlan(): Promise<{
    hasNewLesson: boolean;
    reviewCount: number;
    missions: DailyMission[];
    allLessonsComplete: boolean;
  }> {
    const missions = await this.getDailyMissions();
    
    let reviewCount;
    if (this.reviewSession.startedAt !== null) {
      reviewCount = this.reviewSession.entries.length - this.reviewSession.cursor;
    } else {
      const reviewQuestions = await this.getReviewQuestions();
      reviewCount = reviewQuestions.length;
    }
    
    const hasNewLesson = this.currentCardIndex < this.learningCards.length;
    const allLessonsComplete = this.currentCardIndex >= this.learningCards.length;
    
    return {
      hasNewLesson,
      reviewCount,
      missions,
      allLessonsComplete,
    };
  }
}

// Use DatabaseStorage for persistent data, MemStorage for learning card logic
// TODO: Migrate learning card logic to database
// This is a hybrid approach during migration
class HybridStorage extends MemStorage {
  private dbStorage: DatabaseStorage;

  constructor() {
    super();
    this.dbStorage = new DatabaseStorage();
  }

  // Override core IStorage methods to use database
  async getUser(id: string): Promise<User | undefined> {
    return this.dbStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.dbStorage.getUserByUsername(username);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.dbStorage.createUser(user);
  }

  async updateUserCredits(id: string, credits: number): Promise<void> {
    await this.dbStorage.updateUserCredits(id, credits);
    // Sync to in-memory for learning card logic compatibility
    const user = await this.dbStorage.getUser(id);
    if (user) {
      const memUser = this.users.get(id);
      if (memUser) {
        memUser.credits = user.credits;
      }
    }
  }

  async updateUserStats(id: string, correct: boolean): Promise<void> {
    await this.dbStorage.updateUserStats(id, correct);
    // Sync to in-memory
    const user = await this.dbStorage.getUser(id);
    if (user) {
      const memUser = this.users.get(id);
      if (memUser) {
        memUser.totalAnswered = user.totalAnswered;
        memUser.totalCorrect = user.totalCorrect;
      }
    }
  }

  async updateUserLevel(id: string, level: string): Promise<void> {
    await this.dbStorage.updateUserLevel(id, level);
    // Sync to in-memory
    const user = await this.dbStorage.getUser(id);
    if (user) {
      const memUser = this.users.get(id);
      if (memUser) {
        memUser.currentLevel = user.currentLevel;
      }
    }
  }

  async updateUserStreak(id: string, streak: number): Promise<void> {
    await this.dbStorage.updateUserStreak(id, streak);
    // Sync to in-memory
    const user = await this.dbStorage.getUser(id);
    if (user) {
      const memUser = this.users.get(id);
      if (memUser) {
        memUser.streak = user.streak;
      }
    }
  }

  async getModules(): Promise<Module[]> {
    return this.dbStorage.getModules();
  }

  async getModule(id: string): Promise<Module | undefined> {
    return this.dbStorage.getModule(id);
  }

  async getLessons(moduleId: string): Promise<Lesson[]> {
    return this.dbStorage.getLessons(moduleId);
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    return this.dbStorage.getLesson(id);
  }

  async getQuestions(lessonId: string): Promise<Question[]> {
    return this.dbStorage.getQuestions(lessonId);
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    return this.dbStorage.getQuestion(id);
  }

  async getUserProgress(lessonId: string): Promise<UserProgress | undefined> {
    return this.dbStorage.getUserProgress(lessonId);
  }

  async completeLesson(
    lessonId: string,
    moduleId: string,
    correctAnswers: number,
    totalQuestions: number
  ): Promise<void> {
    await this.dbStorage.completeLesson(lessonId, moduleId, correctAnswers, totalQuestions);
    // Also update in-memory for compatibility
    await super.completeLesson(lessonId, moduleId, correctAnswers, totalQuestions);
  }

  async getCompletedLessonIds(): Promise<string[]> {
    return this.dbStorage.getCompletedLessonIds();
  }

  async getDefaultUser(): Promise<User> {
    const user = await this.dbStorage.getDefaultUser();
    // Sync to in-memory for learning card logic
    this.users.set(user.id, user);
    this.defaultUserId = user.id;
    return user;
  }

  async updateUsername(id: string, username: string): Promise<void> {
    await this.dbStorage.updateUsername(id, username);
    // Sync to in-memory
    const user = await this.dbStorage.getUser(id);
    if (user) {
      const memUser = this.users.get(id);
      if (memUser) {
        memUser.username = user.username;
      }
    }
  }
}

export const storage = new HybridStorage();
