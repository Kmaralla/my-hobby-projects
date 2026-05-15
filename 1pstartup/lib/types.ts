export type Mode = "founder" | "product" | "dev" | "qa-eng" | "sales";

export interface ModeConfig {
  id: Mode;
  label: string;
  icon: string;
  tagline: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface PinnedDecision {
  id: string;
  mode: Mode;
  modeLabel: string;
  modeIcon: string;
  content: string;
  timestamp: number;
}

export const MODES: ModeConfig[] = [
  {
    id: "founder",
    label: "Founder",
    icon: "🎯",
    tagline: "GO / NO-GO / PIVOT strategy",
    description: "Is this a company-level bet worth founder time, and what should we validate first?",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  {
    id: "product",
    label: "Product",
    icon: "🧭",
    tagline: "PRD / PRIORITY / USER FLOW",
    description: "Who is the user, what is the job, and what should the next release include?",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
  {
    id: "dev",
    label: "Dev",
    icon: "⚙️",
    tagline: "SHIP / FIX / REWORK engineering",
    description: "Does the implementation work, is it safe, and what should change before merge?",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "qa-eng",
    label: "QA Eng",
    icon: "🔬",
    tagline: "READY / CAVEATS / TEST MORE",
    description: "What must be verified, what will break, and what blocks release confidence?",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    id: "sales",
    label: "Sales",
    icon: "📣",
    tagline: "BUYER / PITCH / REVENUE MOTION",
    description: "Who buys this, why now, what objections block deals, and how should we sell it?",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
];
