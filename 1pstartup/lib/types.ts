export type Mode = "founder" | "dev" | "qa-eng" | "sales";

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
    tagline: "GO / NO-GO / PIVOT decisions",
    description: "Should we build this? What's the MVP? Is this the most important thing right now?",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  {
    id: "dev",
    label: "Dev",
    icon: "⚙️",
    tagline: "SHIP / NEEDS REWORK verdicts",
    description: "Bugs, security holes, architecture debt, and what to fix before merging.",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "qa-eng",
    label: "QA Eng",
    icon: "🔬",
    tagline: "READY / NEEDS MORE TESTING",
    description: "Test plans, edge cases that break things, and top bugs likely hiding in your code.",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    id: "sales",
    label: "Sales",
    icon: "📣",
    tagline: "READY TO SELL / NEEDS POSITIONING",
    description: "Value prop, pitch, hard objections, and who actually buys this.",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
];
