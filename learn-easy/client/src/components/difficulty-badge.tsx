import { Badge } from "@/components/ui/badge";

type Difficulty = "beginner" | "intermediate" | "advanced";

const difficultyConfig: Record<Difficulty, { label: string; className: string }> = {
  beginner: {
    label: "Beginner",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  intermediate: {
    label: "Intermediate",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  advanced: {
    label: "Advanced",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

type DifficultyBadgeProps = {
  difficulty: string;
};

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const config = difficultyConfig[difficulty as Difficulty] || difficultyConfig.beginner;

  return (
    <Badge 
      variant="outline" 
      className={config.className}
      data-testid={`badge-difficulty-${difficulty}`}
    >
      {config.label}
    </Badge>
  );
}
