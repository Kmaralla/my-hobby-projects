import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Target, Coins, Flame, Award, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/progress-ring";
import { StreakCalendar } from "@/components/streak-calendar";
import type { User } from "@shared/schema";

type ProgressData = {
  user: User;
  totalLessons: number;
  completedLessons: number;
  activeDays: number[];
  recentActivity: {
    date: string;
    lessonsCompleted: number;
    creditsEarned: number;
  }[];
};

export default function Progress() {
  const { data, isLoading } = useQuery<ProgressData>({
    queryKey: ["/api/progress"],
  });

  if (isLoading) {
    return <ProgressSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { user, totalLessons, completedLessons, activeDays, recentActivity } = data;
  const accuracy = user.totalAnswered > 0 
    ? Math.round((user.totalCorrect / user.totalAnswered) * 100) 
    : 0;
  const progressPercent = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-progress-title">
          Your Progress
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your learning journey and achievements
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-md bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-lessons-progress">
                  {completedLessons}/{totalLessons}
                </p>
                <p className="text-sm text-muted-foreground">Lessons</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-md bg-amber-500/10">
                <Coins className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-credits">
                  {user.credits}
                </p>
                <p className="text-sm text-muted-foreground">Credits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-md bg-orange-500/10">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-current-streak">
                  {user.streak}
                </p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-md bg-emerald-500/10">
                <Target className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-overall-accuracy">
                  {accuracy}%
                </p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <ProgressRing progress={progressPercent} size={160} strokeWidth={12} />
            <p className="mt-6 text-lg font-medium">
              {progressPercent}% Complete
            </p>
            <p className="text-sm text-muted-foreground">
              {completedLessons} of {totalLessons} lessons finished
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <StreakCalendar activeDays={activeDays} currentStreak={user.streak} />
            
            {recentActivity.length > 0 && (
              <div className="mt-8 space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Recent Sessions</h4>
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`activity-${index}`}
                  >
                    <span className="text-sm">{activity.date}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {activity.lessonsCompleted} lessons
                      </span>
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Coins className="h-3 w-3" />
                        +{activity.creditsEarned}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}
