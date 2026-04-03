import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Lightbulb, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Question } from "@shared/schema";

type QuestionCardProps = {
  question: Question;
  onAnswer: (isCorrect: boolean, selectedIndex: number) => void;
  onNext: () => void;
};

export function QuestionCard({ question, onAnswer, onNext }: QuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const options = question.options as string[];

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    setShowResult(true);
    onAnswer(selectedIndex === question.correctIndex, selectedIndex);
  };

  const handleNext = () => {
    setSelectedIndex(null);
    setShowResult(false);
    onNext();
  };

  const isCorrect = selectedIndex === question.correctIndex;

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-scenario">
              {question.scenario}
            </p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold leading-relaxed" data-testid="text-question">
        {question.question}
      </h2>

      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectOption = index === question.correctIndex;
          
          let cardClasses = "cursor-pointer transition-all duration-200";
          
          if (showResult) {
            if (isCorrectOption) {
              cardClasses += " bg-emerald-500/10 border-emerald-500";
            } else if (isSelected && !isCorrectOption) {
              cardClasses += " bg-destructive/10 border-destructive";
            }
          } else {
            if (isSelected) {
              cardClasses += " ring-2 ring-primary ring-offset-2 ring-offset-background";
            } else {
              cardClasses += " hover-elevate active-elevate-2";
            }
          }

          return (
            <Card
              key={index}
              className={cardClasses}
              onClick={() => handleSelect(index)}
              data-testid={`card-option-${index}`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-medium text-sm ${
                  showResult && isCorrectOption
                    ? "bg-emerald-500 text-white"
                    : showResult && isSelected && !isCorrectOption
                    ? "bg-destructive text-destructive-foreground"
                    : isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {showResult && isCorrectOption ? (
                    <Check className="h-4 w-4" />
                  ) : showResult && isSelected && !isCorrectOption ? (
                    <X className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <span className="flex-1">{option}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className={isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <div className="p-2 rounded-full bg-emerald-500/20">
                      <Check className="h-5 w-5 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-full bg-amber-500/20">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold mb-2 ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {isCorrect ? "Excellent!" : "Not quite right"}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-explanation">
                      {question.explanation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end gap-3">
        {!showResult ? (
          <Button
            onClick={handleSubmit}
            disabled={selectedIndex === null}
            data-testid="button-submit-answer"
          >
            Check Answer
          </Button>
        ) : (
          <Button onClick={handleNext} data-testid="button-next-question">
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
