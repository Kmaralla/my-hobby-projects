import { Lock, ChevronRight, Brain, Bot, Workflow, Sparkles, Database, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "./progress-ring";
import type { Module } from "@shared/schema";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  bot: Bot,
  workflow: Workflow,
  sparkles: Sparkles,
  database: Database,
  message: MessageSquare,
};

type ModuleCardProps = {
  module: Module;
  progress?: { completed: number; total: number };
  onClick?: () => void;
  isCurrent?: boolean;
};

export function ModuleCard({ module, progress, onClick, isCurrent }: ModuleCardProps) {
  const Icon = iconMap[module.icon] || Brain;
  const progressPercent = progress ? (progress.completed / progress.total) * 100 : 0;
  const isLocked = module.isLocked;

  return (
    <Card
      className={`relative overflow-visible transition-all duration-200 ${
        isLocked 
          ? "opacity-60 cursor-not-allowed" 
          : "cursor-pointer hover-elevate active-elevate-2"
      } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      onClick={isLocked ? undefined : onClick}
      data-testid={`card-module-${module.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={`p-3 rounded-md ${isLocked ? "bg-muted" : "bg-primary/10"}`}>
              {isLocked ? (
                <Lock className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Icon className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-lg truncate" data-testid={`text-module-title-${module.id}`}>
                  {module.title}
                </h3>
                {isCurrent && !isLocked && (
                  <Badge variant="default" className="text-xs">
                    In Progress
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm line-clamp-2">
                {module.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {!isLocked && progress && progress.total > 0 && (
              <ProgressRing progress={progressPercent} size={48} strokeWidth={4} />
            )}
            {!isLocked && (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
