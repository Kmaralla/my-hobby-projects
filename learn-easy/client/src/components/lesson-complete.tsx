import { motion } from "framer-motion";
import { Trophy, Star, ArrowRight, Home, Coins, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "./progress-ring";

type LessonCompleteProps = {
  correctAnswers: number;
  totalQuestions: number;
  creditsEarned: number;
  onContinue: () => void;
  onGoHome: () => void;
  nextLessonTitle?: string;
};

export function LessonComplete({
  correctAnswers,
  totalQuestions,
  creditsEarned,
  onContinue,
  onGoHome,
  nextLessonTitle,
}: LessonCompleteProps) {
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  const isExcellent = accuracy >= 80;
  const isGood = accuracy >= 60 && accuracy < 80;

  return (
    <div className="max-w-lg mx-auto space-y-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="flex justify-center"
      >
        <div className={`p-6 rounded-full ${
          isExcellent 
            ? "bg-amber-500/20" 
            : isGood 
            ? "bg-emerald-500/20" 
            : "bg-primary/20"
        }`}>
          <Trophy className={`h-16 w-16 ${
            isExcellent 
              ? "text-amber-500" 
              : isGood 
              ? "text-emerald-500" 
              : "text-primary"
          }`} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold" data-testid="text-completion-title">
          {isExcellent ? "Outstanding!" : isGood ? "Well Done!" : "Lesson Complete"}
        </h1>
        <p className="text-muted-foreground">
          {isExcellent 
            ? "You've mastered this lesson!" 
            : isGood 
            ? "Great progress on this lesson!" 
            : "Keep practicing to improve!"}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center mb-6">
              <ProgressRing progress={accuracy} size={120} strokeWidth={10} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Target className="h-5 w-5 text-emerald-500" />
                  <span className="text-2xl font-bold" data-testid="text-correct-count">
                    {correctAnswers}/{totalQuestions}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Correct Answers</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <span className="text-2xl font-bold" data-testid="text-credits-earned">
                    +{creditsEarned}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Credits Earned</p>
              </div>
            </div>

            {isExcellent && (
              <div className="mt-6 flex justify-center gap-1">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                  >
                    <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        <Button variant="outline" onClick={onGoHome} data-testid="button-go-home">
          <Home className="h-4 w-4 mr-2" />
          Dashboard
        </Button>
        {nextLessonTitle && (
          <Button onClick={onContinue} data-testid="button-next-lesson">
            Next: {nextLessonTitle}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </motion.div>
    </div>
  );
}
