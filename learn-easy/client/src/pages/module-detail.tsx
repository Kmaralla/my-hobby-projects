import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Play, Check, Lock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/progress-ring";
import { DifficultyBadge } from "@/components/difficulty-badge";
import type { Module, Lesson } from "@shared/schema";

type ModuleDetailData = {
  module: Module;
  lessons: (Lesson & { completed: boolean })[];
  progress: { completed: number; total: number };
};

export default function ModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<ModuleDetailData>({
    queryKey: ["/api/modules", id],
  });

  if (isLoading) {
    return <ModuleDetailSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { module, lessons, progress } = data;
  const progressPercent = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setLocation("/lessons")}
        data-testid="button-back-to-modules"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Modules
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-module-title">
            {module.title}
          </h1>
          <p className="text-muted-foreground text-lg">
            {module.description}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing progress={progressPercent} size={80} strokeWidth={6} />
          <div className="text-center">
            <p className="text-2xl font-bold">{progress.completed}/{progress.total}</p>
            <p className="text-sm text-muted-foreground">Lessons</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Lessons
        </h2>
        
        {lessons.map((lesson, index) => {
          const isLocked = index > 0 && !lessons[index - 1].completed;
          const isCompleted = lesson.completed;
          const isNext = !isCompleted && !isLocked;

          return (
            <Card
              key={lesson.id}
              className={`transition-all duration-200 ${
                isLocked 
                  ? "opacity-60 cursor-not-allowed" 
                  : "cursor-pointer hover-elevate active-elevate-2"
              } ${isNext ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              onClick={isLocked ? undefined : () => setLocation(`/lesson/${lesson.id}`)}
              data-testid={`card-lesson-${lesson.id}`}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isLocked
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground"
                }`}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate" data-testid={`text-lesson-title-${lesson.id}`}>
                    {lesson.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <DifficultyBadge difficulty={lesson.difficulty} />
                    {isCompleted && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        Completed
                      </span>
                    )}
                  </div>
                </div>

                {!isLocked && !isCompleted && (
                  <Button size="sm" data-testid={`button-start-lesson-${lesson.id}`}>
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
                
                {isCompleted && (
                  <Button size="sm" variant="outline" data-testid={`button-review-lesson-${lesson.id}`}>
                    Review
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ModuleDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-32" />
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-full max-w-md" />
        </div>
        <Skeleton className="h-20 w-32" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-7 w-24" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
