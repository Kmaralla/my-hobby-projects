import { Coins, Flame, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StatsBarProps = {
  credits: number;
  streak: number;
  accuracy: number;
};

export function StatsBar({ credits, streak, accuracy }: StatsBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
        <Coins className="h-4 w-4 text-amber-500" />
        <span className="font-medium" data-testid="text-credits">{credits}</span>
      </Badge>
      
      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
        <Flame className="h-4 w-4 text-orange-500" />
        <span className="font-medium" data-testid="text-streak">{streak} day streak</span>
      </Badge>
      
      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
        <Target className="h-4 w-4 text-emerald-500" />
        <span className="font-medium" data-testid="text-accuracy">{accuracy}% accuracy</span>
      </Badge>
    </div>
  );
}
