import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Flame,
  Target,
  ArrowRight,
  Check,
  X,
  Lightbulb,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Sparkles,
  User,
  Trophy,
  RefreshCw,
  Star,
  Lock,
  Clock,
  Users,
  Code,
  MessageCircle,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CreditReward } from "@/components/credit-reward";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User as UserType, Question } from "@shared/schema";

type DailyMission = {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
};

type DailyPlan = {
  hasNewLesson: boolean;
  reviewCount: number;
  missions: DailyMission[];
  allLessonsComplete: boolean;
};

type TopicInfo = {
  id: string;
  title: string;
  description: string;
  audience: "all" | "developer" | "product-owner";
  lessonCount: number;
  completedLessons: number;
  isLocked: boolean;
  unlocksAt: string | null;
  unlocksOnDay?: number;
  unlockDate?: string | null;
};

type LearningData = {
  user: UserType;
  currentCard: {
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
  } | null;
  streak: number;
  todayProgress: number;
  totalCards: number;
  dailyPlan?: DailyPlan;
  isInReviewMode?: boolean;
};

type DailyLockStatus = {
  dateKey: string;
  goals: {
    questionsAnswered: number;
    lessonsCompleted: number;
    creditsEarned: number;
  };
  stats: {
    questionsAnswered: number;
    correctAnswers: number;
    lessonsCompleted: number;
    creditsEarned: number;
  };
  remaining: {
    questionsAnswered: number;
    lessonsCompleted: number;
    creditsEarned: number;
  };
  completedGoals: number;
  totalGoals: number;
  isLocked: boolean;
};

type LearningStats = {
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  notStartedTopics: number;
  unlockedTopics: number;
  lockedTopics: number;
  accuracy: number;
  totalAnswered: number;
  totalCorrect: number;
  dailyLock: DailyLockStatus;
  nextGoals: string[];
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorAnswer, setTutorAnswer] = useState<string | null>(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  // Vibe nudge
  const [vibeNudge, setVibeNudge] = useState<{ message: string; type: string } | null>(null);
  const [vibeShown, setVibeShown] = useState(false);
  const [conceptStartTime, setConceptStartTime] = useState<number>(Date.now());
  // Social: expanded comments per topic
  const [expandedCommentTopicId, setExpandedCommentTopicId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("learnai-username");
    if (stored) {
      setUserName(stored);
    }
  }, []);

  const { data, isLoading, refetch } = useQuery<LearningData>({
    queryKey: ["/api/learn"],
    enabled: !!userName,
  });

  const { data: topicsData } = useQuery<{ topics: TopicInfo[] }>({
    queryKey: ["/api/topics"],
    enabled: !!userName,
  });

  const { data: dailyLockData } = useQuery<DailyLockStatus>({
    queryKey: ["/api/daily-lock-status"],
    enabled: !!userName,
    refetchInterval: 15000,
  });

  const { data: learningStats } = useQuery<LearningStats>({
    queryKey: ["/api/learning-stats"],
    enabled: !!userName,
    refetchInterval: 30000,
  });

  const { data: commentCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/topics/comment-counts"],
    enabled: !!userName,
  });

  const { data: activeTopicComments, refetch: refetchComments } = useQuery<Array<{
    id: string; username: string; content: string; createdAt: string;
  }>>({
    queryKey: [`/api/topics/${expandedCommentTopicId}/comments`],
    enabled: !!expandedCommentTopicId,
  });

  const { data: activeTopicLeaderboard } = useQuery<{
    entries: Array<{ rank: number; username: string; completionPercentage: number; expertiseLevel: string }>;
    totalLearners: number;
  }>({
    queryKey: [`/api/topics/${expandedCommentTopicId}/leaderboard`],
    enabled: !!expandedCommentTopicId,
  });

  const setUserNameMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/user/set-name", { username: name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learn"] });
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (payload: {
      questionId: string;
      isCorrect: boolean;
      creditsEarned: number;
      lessonIndex: number;
    }) => {
      return apiRequest("POST", "/api/answer", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learn"] });
    },
  });

  const nextCardMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/next-card", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learn"] });
      setSelectedAnswer(null);
      setHasAnswered(false);
    },
  });

  const startReviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/start-review", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learn"] });
      setSelectedAnswer(null);
      setHasAnswered(false);
    },
  });

  const exitReviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/exit-review", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learn"] });
      setSelectedAnswer(null);
      setHasAnswered(false);
    },
  });

  // Reset vibe state when concept changes
  useEffect(() => {
    if (data?.currentCard?.type === "concept") {
      setConceptStartTime(Date.now());
      setVibeNudge(null);
      setVibeShown(false);
    }
  }, [data?.currentCard?.id]);

  // Fire vibe nudge after 25 seconds on concept card
  useEffect(() => {
    if (!data?.currentCard || data.currentCard.type !== "concept" || vibeShown) return;
    const timer = setTimeout(async () => {
      setVibeShown(true);
      try {
        const res = await apiRequest("POST", "/api/vibe-nudge", {
          conceptId: data.currentCard!.id,
          secondsSpent: Math.round((Date.now() - conceptStartTime) / 1000),
        });
        const nudge = await res.json();
        setVibeNudge(nudge);
      } catch {
        // silent fail
      }
    }, 25000);
    return () => clearTimeout(timer);
  }, [data?.currentCard?.id, vibeShown, conceptStartTime]);

  const handlePostComment = useCallback(async (topicId: string) => {
    if (!commentText.trim()) return;
    try {
      await apiRequest("POST", `/api/topics/${topicId}/comments`, { content: commentText });
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["/api/topics/comment-counts"] });
    } catch {
      // silent
    }
  }, [commentText, refetchComments]);

  const handleAskTutor = useCallback(async (conceptId: string) => {
    if (!tutorQuestion.trim()) return;
    setTutorLoading(true);
    setTutorAnswer(null);
    try {
      const res = await apiRequest("POST", "/api/ask-tutor", { conceptId, question: tutorQuestion });
      const data = await res.json();
      setTutorAnswer(data.answer || "No answer returned.");
    } catch {
      setTutorAnswer("Sorry, the AI tutor is unavailable right now.");
    } finally {
      setTutorLoading(false);
    }
  }, [tutorQuestion]);

  const handleSetName = useCallback(() => {
    if (nameInput.trim()) {
      localStorage.setItem("learnai-username", nameInput.trim());
      setUserName(nameInput.trim());
      setUserNameMutation.mutate(nameInput.trim());
    }
  }, [nameInput, setUserNameMutation]);

  const handleSelectAnswer = useCallback(
    (index: number) => {
      if (hasAnswered || !data?.currentCard?.question) return;

      setSelectedAnswer(index);
      setHasAnswered(true);

      const question = data.currentCard.question;
      const isCorrect = index === question.correctIndex;
      const earned = isCorrect ? question.creditsReward : 0;

      if (earned > 0) {
        setRewardAmount(earned);
        setShowReward(true);
        setTimeout(() => setShowReward(false), 2000);
      }

      submitAnswerMutation.mutate({
        questionId: question.id,
        isCorrect,
        creditsEarned: earned,
        lessonIndex: data.currentCard.lessonIndex,
      });
    },
    [hasAnswered, data, submitAnswerMutation],
  );

  const handleStartReview = useCallback(() => {
    startReviewMutation.mutate();
  }, [startReviewMutation]);

  const handleExitReview = useCallback(() => {
    exitReviewMutation.mutate();
  }, [exitReviewMutation]);

  const handleNext = useCallback(() => {
    nextCardMutation.mutate();
  }, [nextCardMutation]);

  const handleStartQuestions = useCallback(() => {
    nextCardMutation.mutate();
  }, [nextCardMutation]);

  if (!userName) {
    return (
      <div className="min-h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/10">
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md relative z-10"
          >
            <Card className="overflow-hidden shadow-lg border-primary/10">
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-0.5">
                <CardContent className="p-8 bg-card rounded-md text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">
                    Welcome to Learn-Tech
                  </h1>
                  <p className="text-muted-foreground mb-6">
                    Enter your name to start learning and track your progress
                  </p>
                  <div className="space-y-4">
                    <Input
                      placeholder="Your name"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSetName()}
                      className="text-center text-lg"
                      data-testid="input-username"
                    />
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleSetName}
                      disabled={!nameInput.trim()}
                      data-testid="button-start-learning"
                    >
                      Start Learning
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { user, currentCard, streak, todayProgress, totalCards } = data;
  const accuracy =
    user.totalAnswered > 0
      ? Math.round((user.totalCorrect / user.totalAnswered) * 100)
      : 0;

  const getLevelProgress = () => {
    if (user.currentLevel === "advanced") {
      return { progress: 100, nextLevel: null, needed: 0 };
    }
    if (user.currentLevel === "intermediate") {
      const target = 90;
      const minQuestions = 6;
      const questionsNeeded = Math.max(0, minQuestions - user.totalAnswered);
      const accuracyNeeded = Math.max(0, target - accuracy);
      return {
        progress: Math.min((accuracy / target) * 100, 100),
        nextLevel: "Advanced",
        needed:
          questionsNeeded > 0
            ? `${questionsNeeded} more questions`
            : accuracyNeeded > 0
              ? `${accuracyNeeded}% more accuracy`
              : "Almost there!",
      };
    }
    const target = 80;
    const minQuestions = 3;
    const questionsNeeded = Math.max(0, minQuestions - user.totalAnswered);
    const accuracyNeeded = Math.max(0, target - accuracy);
    return {
      progress: Math.min((accuracy / target) * 100, 100),
      nextLevel: "Intermediate",
      needed:
        questionsNeeded > 0
          ? `${questionsNeeded} more questions`
          : accuracyNeeded > 0
            ? `${accuracyNeeded}% more accuracy`
            : "Almost there!",
    };
  };

  const levelProgress = getLevelProgress();
  const lessonStep = currentCard?.stepInLesson || 1;
  const lessonNumber = (currentCard?.lessonIndex || 0) + 1;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "advanced":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      case "intermediate":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
      default:
        return "bg-primary/10 text-primary border-primary/30";
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      <CreditReward amount={rewardAmount} isVisible={showReward} />

      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="h-4 w-px bg-border" />
              {currentCard && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <BookOpen className="h-3 w-3 text-primary" />
                  <span className="text-xs font-semibold text-primary truncate max-w-[140px]">
                    {currentCard.topic}
                  </span>
                </div>
              )}
              <span
                className="font-medium text-sm hidden sm:inline text-muted-foreground"
                data-testid="text-username"
              >
                {userName}
              </span>
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" />
                <span
                  className="font-semibold text-sm"
                  data-testid="text-credits"
                >
                  {user.credits}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                <span
                  className="font-semibold text-sm"
                  data-testid="text-streak"
                >
                  {streak} day{streak !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-emerald-500" />
                <span
                  className="font-semibold text-sm"
                  data-testid="text-accuracy"
                >
                  {accuracy}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${getDifficultyColor(user.currentLevel)}`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    user.currentLevel === "advanced"
                      ? "bg-emerald-500"
                      : user.currentLevel === "intermediate"
                        ? "bg-amber-500"
                        : "bg-primary"
                  }`}
                />
                <span className="text-sm font-semibold capitalize">
                  {user.currentLevel}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {levelProgress.nextLevel && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">
                  Next:{" "}
                  <span className="font-medium text-foreground">
                    {levelProgress.nextLevel}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {levelProgress.needed}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    user.currentLevel === "intermediate"
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-2xl relative z-10">
          {dailyLockData && dailyLockData.isLocked && (
            <div className="mb-4 flex items-center gap-3 px-3 py-2 rounded-md bg-muted/60 border text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span>Daily goal: {dailyLockData.completedGoals}/{dailyLockData.totalGoals} done</span>
              <span className="text-muted-foreground/60">·</span>
              <span>{dailyLockData.stats.questionsAnswered}/{dailyLockData.goals.questionsAnswered} questions</span>
              <span className="text-muted-foreground/60">·</span>
              <span>{dailyLockData.stats.lessonsCompleted}/{dailyLockData.goals.lessonsCompleted} lessons</span>
            </div>
          )}

          {(learningStats?.nextGoals?.length ?? 0) > 0 && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/15 text-xs">
              <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{learningStats?.nextGoals?.join(" • ")}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!currentCard ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                      <Trophy className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">
                      Great job, {userName}!
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      All lessons done for now. Pick your next topic below or come back tomorrow.
                    </p>
                  </CardContent>
                </Card>

                {data.dailyPlan && data.dailyPlan.missions.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="h-5 w-5 text-amber-500" />
                        <h3 className="font-semibold">Today's Missions</h3>
                      </div>
                      <div className="space-y-4">
                        {data.dailyPlan.missions.map((mission) => (
                          <div
                            key={mission.id}
                            className={`p-4 rounded-md border ${mission.completed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/50"}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {mission.completed ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Target className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm">
                                  {mission.title}
                                </span>
                              </div>
                              <Badge className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                +{mission.reward} credits
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {mission.description}
                            </p>
                            <Progress
                              value={(mission.current / mission.target) * 100}
                              className="h-1.5"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {mission.current}/{mission.target}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {data.dailyPlan && data.dailyPlan.reviewCount > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Review Mode</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        You have {data.dailyPlan.reviewCount} question
                        {data.dailyPlan.reviewCount !== 1 ? "s" : ""} ready for
                        review. Practice makes perfect!
                      </p>
                      <Button
                        onClick={handleStartReview}
                        className="w-full"
                        data-testid="button-start-review"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Start Review
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    data-testid="button-refresh"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </motion.div>
            ) : currentCard.type === "concept" && currentCard.concept ? (
              <motion.div
                key={`concept-${currentCard.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden shadow-lg border-primary/10">
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-0.5">
                    <CardContent className="p-6 sm:p-8 bg-card rounded-md">
                      {/* Topic header with community links */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                            {currentCard.topic}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Lesson {lessonNumber}
                            </Badge>
                            <Badge className={`text-xs capitalize border ${getDifficultyColor(currentCard.difficulty)}`}>
                              {currentCard.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setLocation(`/topics/${currentCard.topicId}?tab=community`)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary/5"
                            title="Community"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Community</span>
                          </button>
                          <button
                            onClick={() => setLocation(`/topics/${currentCard.topicId}?tab=leaderboard`)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-500 transition-colors px-2 py-1 rounded hover:bg-amber-500/5"
                            title="Leaderboard"
                          >
                            <Trophy className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Leaders</span>
                          </button>
                        </div>
                      </div>

                      {/* Step progress bar */}
                      <div className="flex gap-1 mb-6">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`h-1 flex-1 rounded-full ${
                              step <= lessonStep ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>

                      <h2
                        className="text-2xl font-bold mb-4"
                        data-testid="text-concept-title"
                      >
                        {currentCard.concept.title}
                      </h2>

                      <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
                        {currentCard.concept.content
                          .split("\n\n")
                          .map((paragraph, i) => (
                            <p
                              key={i}
                              className="text-muted-foreground leading-relaxed"
                            >
                              {paragraph}
                            </p>
                          ))}
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-md p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm mb-1">
                              Key Takeaway
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {currentCard.concept.keyTakeaway}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Vibe Learner Nudge */}
                      {vibeNudge && (
                        <div className={`mb-4 p-3 rounded-md border flex items-start gap-2 ${
                          vibeNudge.type === "hint"
                            ? "bg-amber-500/5 border-amber-500/20"
                            : vibeNudge.type === "challenge"
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : "bg-primary/5 border-primary/20"
                        }`}>
                          <Sparkles className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                            vibeNudge.type === "hint" ? "text-amber-500"
                              : vibeNudge.type === "challenge" ? "text-emerald-500"
                              : "text-primary"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold mb-0.5 capitalize text-muted-foreground">
                              Vibe Learner {vibeNudge.type === "hint" ? "💡 Hint" : vibeNudge.type === "challenge" ? "🔥 Challenge" : "✨ Nudge"}
                            </p>
                            <p className="text-sm">{vibeNudge.message}</p>
                          </div>
                          <button onClick={() => setVibeNudge(null)} className="text-muted-foreground hover:text-foreground text-xs flex-shrink-0">✕</button>
                        </div>
                      )}

                      {/* AI Tutor */}
                      <div className="mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={() => {
                            setTutorOpen((o) => !o);
                            setTutorAnswer(null);
                            setTutorQuestion("");
                          }}
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-primary" />
                          {tutorOpen ? "Close AI Tutor" : "Ask AI Tutor"}
                        </Button>
                        {tutorOpen && (
                          <div className="mt-3 space-y-2 p-3 rounded-md border bg-muted/30">
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-primary" />
                              Ask anything about this concept
                            </p>
                            <div className="flex gap-2">
                              <Input
                                value={tutorQuestion}
                                onChange={(e) => setTutorQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAskTutor(currentCard.id)}
                                placeholder="e.g. Can you give me a simpler example?"
                                className="text-sm h-8"
                              />
                              <Button
                                size="sm"
                                className="h-8 px-3"
                                onClick={() => handleAskTutor(currentCard.id)}
                                disabled={tutorLoading || !tutorQuestion.trim()}
                              >
                                {tutorLoading ? "..." : <Send className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                            {tutorAnswer && (
                              <div className="p-3 rounded-md bg-background border text-sm text-muted-foreground leading-relaxed">
                                {tutorAnswer}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleStartQuestions}
                        disabled={nextCardMutation.isPending}
                        data-testid="button-next-step"
                      >
                        {nextCardMutation.isPending
                          ? "Loading..."
                          : "Continue to Example"}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ) : currentCard.type === "example" && currentCard.example ? (
              <motion.div
                key={`example-${currentCard.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden shadow-lg border-amber-500/20">
                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-0.5">
                    <CardContent className="p-6 sm:p-8 bg-card rounded-md">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Lesson {lessonNumber}
                          </Badge>
                          <Badge
                            className={`text-xs capitalize border ${getDifficultyColor(currentCard.difficulty)}`}
                          >
                            {currentCard.difficulty}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Step {lessonStep} of 3</span>
                        </div>
                      </div>

                      <div className="flex gap-1 mb-6">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`h-1 flex-1 rounded-full ${
                              step <= lessonStep ? "bg-amber-500" : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-md bg-amber-500/10">
                          <Sparkles className="h-5 w-5 text-amber-500" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          Real-World Example
                        </span>
                      </div>

                      <h2
                        className="text-2xl font-bold mb-4"
                        data-testid="text-example-title"
                      >
                        {currentCard.example.title}
                      </h2>

                      <div className="bg-muted/50 rounded-md p-4 mb-6">
                        <p className="text-sm italic text-muted-foreground">
                          {currentCard.example.scenario}
                        </p>
                      </div>

                      <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
                        {currentCard.example.explanation
                          .split("\n\n")
                          .map((paragraph, i) => (
                            <p
                              key={i}
                              className="text-muted-foreground leading-relaxed whitespace-pre-line"
                            >
                              {paragraph}
                            </p>
                          ))}
                      </div>

                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-md p-4 mb-6">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm mb-1">
                              Real-World Application
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {currentCard.example.realWorldApplication}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleStartQuestions}
                        disabled={nextCardMutation.isPending}
                        data-testid="button-start-quiz"
                      >
                        {nextCardMutation.isPending
                          ? "Loading..."
                          : "Ready for Quiz"}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ) : currentCard.question ? (
              <motion.div
                key={`question-${currentCard.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden shadow-lg border-emerald-500/20">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Lesson {lessonNumber}
                        </Badge>
                        <Badge
                          className={`text-xs capitalize border ${getDifficultyColor(currentCard.difficulty)}`}
                        >
                          {currentCard.difficulty}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="h-3.5 w-3.5" />
                          <span>Step {lessonStep} of 3</span>
                        </div>
                        <Badge className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                          +{currentCard.question.creditsReward} credits
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-1 mb-6">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`h-1 flex-1 rounded-full ${
                            step <= lessonStep ? "bg-emerald-500" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>

                    {currentCard.question.scenario && (
                      <div className="bg-muted/50 rounded-md p-4 mb-4">
                        <p className="text-sm italic text-muted-foreground">
                          {currentCard.question.scenario}
                        </p>
                      </div>
                    )}

                    <h3
                      className="text-xl font-semibold mb-6"
                      data-testid="text-question"
                    >
                      {currentCard.question.question}
                    </h3>

                    <div className="space-y-3 mb-6">
                      {currentCard.question.options.map((option, index) => {
                        const isSelected = selectedAnswer === index;
                        const isCorrect =
                          index === currentCard.question!.correctIndex;
                        const showResult = hasAnswered;

                        let className =
                          "w-full text-left p-4 rounded-md border transition-all ";
                        if (showResult) {
                          if (isCorrect) {
                            className +=
                              "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300";
                          } else if (isSelected && !isCorrect) {
                            className +=
                              "bg-destructive/10 border-destructive text-destructive";
                          } else {
                            className += "opacity-50";
                          }
                        } else if (isSelected) {
                          className += "bg-primary/10 border-primary";
                        } else {
                          className += "hover-elevate active-elevate-2";
                        }

                        return (
                          <button
                            key={index}
                            className={className}
                            onClick={() => handleSelectAnswer(index)}
                            disabled={hasAnswered}
                            data-testid={`button-option-${index}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm font-medium shrink-0">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="text-sm">{option}</span>
                              {showResult && isCorrect && (
                                <Check className="h-5 w-5 text-emerald-500 ml-auto shrink-0" />
                              )}
                              {showResult && isSelected && !isCorrect && (
                                <X className="h-5 w-5 text-destructive ml-auto shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {hasAnswered && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <div
                            className={`p-4 rounded-md mb-6 ${
                              selectedAnswer ===
                              currentCard.question.correctIndex
                                ? "bg-emerald-500/10 border border-emerald-500/30"
                                : "bg-destructive/10 border border-destructive/30"
                            }`}
                          >
                            <p className="font-medium text-sm mb-2">
                              {selectedAnswer ===
                              currentCard.question.correctIndex
                                ? "Excellent!"
                                : "Not quite right"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {currentCard.question.explanation}
                            </p>
                          </div>

                          <Button
                            className="w-full"
                            size="lg"
                            onClick={handleNext}
                            disabled={nextCardMutation.isPending}
                            data-testid="button-next-card"
                          >
                            Next Lesson
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Topics Section - Always Visible */}
          {topicsData && topicsData.topics.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">All Topics</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {topicsData.topics.filter(t => t.completedLessons >= t.lessonCount && t.lessonCount > 0).length}/{topicsData.topics.length} completed
                    </span>
                  </div>
                  <div className="space-y-3">
                    {topicsData.topics.map((topic) => {
                      const isComplete =
                        topic.completedLessons >= topic.lessonCount;
                      const audienceIcon =
                        topic.audience === "developer"
                          ? Code
                          : topic.audience === "product-owner"
                            ? Users
                            : BookOpen;
                      const AudienceIcon = audienceIcon;
                      const isCurrent = currentCard?.topicId === topic.id;

                      return (
                        <div
                          key={topic.id}
                          className={`p-4 rounded-md border ${
                            topic.isLocked
                              ? "opacity-60 bg-muted/30"
                              : isCurrent
                                ? "border-primary/50 bg-primary/5"
                                : isComplete
                                  ? "bg-emerald-500/5 border-emerald-500/30"
                                  : "hover-elevate"
                          }`}
                          data-testid={`topic-card-${topic.id}`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`p-2 rounded-md shrink-0 ${
                                  topic.isLocked
                                    ? "bg-muted"
                                    : isComplete
                                      ? "bg-emerald-500/10"
                                      : "bg-primary/10"
                                }`}
                              >
                                {topic.isLocked ? (
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                ) : isComplete ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <BookOpen className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {topic.title}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs capitalize"
                                  >
                                    <AudienceIcon className="h-3 w-3 mr-1" />
                                    {topic.audience === "product-owner"
                                      ? "Product"
                                      : topic.audience === "developer"
                                        ? "Dev"
                                        : "All"}
                                  </Badge>
                                  {isCurrent && (
                                    <Badge className="text-xs bg-primary/10 text-primary border-primary/30">
                                      Current
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {topic.description}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {topic.isLocked ? (
                                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>Day {topic.unlocksOnDay || "?"}</span>
                                  </div>
                                  {topic.unlockDate && (
                                    <span className="text-[10px]">
                                      {new Date(topic.unlockDate).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {topic.completedLessons}/{topic.lessonCount}{" "}
                                  lessons
                                </span>
                              )}
                            </div>
                          </div>
                          {!topic.isLocked && !isComplete && topic.lessonCount > 0 && (
                            <div className="mt-3">
                              <Progress
                                value={
                                  (topic.completedLessons / topic.lessonCount) *
                                  100
                                }
                                className="h-1.5"
                              />
                            </div>
                          )}
                          {!topic.isLocked && (
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant={isCurrent ? "secondary" : "default"}
                                className="w-full text-xs h-7"
                                onClick={async () => {
                                  if (isComplete) {
                                    setLocation(`/topics/${topic.id}`);
                                  } else {
                                    await apiRequest("POST", "/api/select-topic", { topicId: topic.id });
                                    queryClient.invalidateQueries({ queryKey: ["/api/learn"] });
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                  }
                                }}
                              >
                                {isComplete ? "Review" : isCurrent ? "Continue Learning" : "Start Learning"}
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-full flex flex-col">
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-1.5 w-full mt-3" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
