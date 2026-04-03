import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TheorySection } from "@/components/theory-section";
import { QuestionCard } from "@/components/question-card";
import { LessonProgress } from "@/components/lesson-progress";
import { LessonComplete } from "@/components/lesson-complete";
import { CreditReward } from "@/components/credit-reward";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Question, Lesson } from "@shared/schema";

type LessonData = {
  lesson: Lesson;
  questions: Question[];
  nextLesson: { id: string; title: string } | null;
  moduleLessons: { id: string; title: string }[];
};

type Phase = "theory" | "questions" | "complete";

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  const [phase, setPhase] = useState<Phase>("theory");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean[]>([]);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  const { data, isLoading } = useQuery<LessonData>({
    queryKey: ["/api/lessons", id],
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (data: { questionId: string; isCorrect: boolean; creditsEarned: number }) => {
      return apiRequest("POST", "/api/answer", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
  });

  const completeLessonMutation = useMutation({
    mutationFn: async (data: { lessonId: string; correctAnswers: number; totalQuestions: number }) => {
      return apiRequest("POST", "/api/complete-lesson", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
    },
  });

  const handleAnswer = useCallback((isCorrect: boolean, selectedIndex: number) => {
    if (!data) return;

    const question = data.questions[currentQuestionIndex];
    const earned = isCorrect ? question.creditsReward : 0;

    setAnsweredCorrectly(prev => [...prev, isCorrect]);
    
    if (earned > 0) {
      setCreditsEarned(prev => prev + earned);
      setRewardAmount(earned);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 2000);
    }

    submitAnswerMutation.mutate({
      questionId: question.id,
      isCorrect,
      creditsEarned: earned,
    });
  }, [data, currentQuestionIndex, submitAnswerMutation]);

  const handleNextQuestion = useCallback(() => {
    if (!data) return;

    if (currentQuestionIndex < data.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      const totalCorrect = answeredCorrectly.filter(Boolean).length;
      completeLessonMutation.mutate({
        lessonId: data.lesson.id,
        correctAnswers: totalCorrect,
        totalQuestions: data.questions.length,
      });
      setPhase("complete");
    }
  }, [data, currentQuestionIndex, answeredCorrectly, completeLessonMutation]);

  const handleContinueToQuestions = useCallback(() => {
    setPhase("questions");
  }, []);

  const handleGoHome = useCallback(() => {
    setLocation("/");
  }, [setLocation]);

  const handleNextLesson = useCallback(() => {
    if (data?.nextLesson) {
      setPhase("theory");
      setCurrentQuestionIndex(0);
      setAnsweredCorrectly([]);
      setCreditsEarned(0);
      setLocation(`/lesson/${data.nextLesson.id}`);
    }
  }, [data, setLocation]);

  if (isLoading) {
    return <LessonSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { lesson, questions, nextLesson } = data;
  const correctCount = answeredCorrectly.filter(Boolean).length;

  return (
    <div className="min-h-full">
      <CreditReward amount={rewardAmount} isVisible={showReward} />

      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b mb-8">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleGoHome}
              data-testid="button-exit-lesson"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
            <DifficultyBadge difficulty={lesson.difficulty} />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleGoHome}
              data-testid="button-close-lesson"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {phase === "questions" && (
            <LessonProgress
              current={currentQuestionIndex}
              total={questions.length}
              answeredCorrectly={answeredCorrectly}
            />
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-12">
        <AnimatePresence mode="wait">
          {phase === "theory" && (
            <motion.div
              key="theory"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <TheorySection
                title={lesson.title}
                content={lesson.theory}
                onContinue={handleContinueToQuestions}
              />
            </motion.div>
          )}

          {phase === "questions" && questions[currentQuestionIndex] && (
            <motion.div
              key={`question-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <QuestionCard
                question={questions[currentQuestionIndex]}
                onAnswer={handleAnswer}
                onNext={handleNextQuestion}
              />
            </motion.div>
          )}

          {phase === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <LessonComplete
                correctAnswers={correctCount}
                totalQuestions={questions.length}
                creditsEarned={creditsEarned}
                onContinue={handleNextLesson}
                onGoHome={handleGoHome}
                nextLessonTitle={nextLesson?.title}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-50 bg-background border-b mb-8">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-12 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
