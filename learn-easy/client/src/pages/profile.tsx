import { useQuery } from "@tanstack/react-query";
import { User, Award, Target, BookOpen, Coins, Flame, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DifficultyBadge } from "@/components/difficulty-badge";
import type { User as UserType } from "@shared/schema";

type ProfileData = {
  user: UserType;
  achievements: {
    id: string;
    title: string;
    description: string;
    earned: boolean;
  }[];
  stats: {
    totalLessons: number;
    completedLessons: number;
    totalQuestions: number;
    correctAnswers: number;
  };
};

export default function Profile() {
  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/profile"],
  });

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!data) {
    return null;
  }

  const { user, achievements, stats } = data;
  const accuracy = user.totalAnswered > 0 
    ? Math.round((user.totalCorrect / user.totalAnswered) * 100) 
    : 0;

  const earnedAchievements = achievements.filter(a => a.earned);

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold" data-testid="text-username">
                {user.username}
              </h1>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <DifficultyBadge difficulty={user.currentLevel} />
                <Badge variant="secondary" className="gap-1">
                  <Coins className="h-3 w-3 text-amber-500" />
                  {user.credits} credits
                </Badge>
              </div>
            </div>

            <div className="flex gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-primary" data-testid="text-profile-streak">
                  {user.streak}
                </p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-profile-accuracy">
                  {accuracy}%
                </p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.completedLessons}</p>
                <p className="text-xs text-muted-foreground">Lessons Done</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-emerald-500/10">
                <Target className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.correctAnswers}</p>
                <p className="text-xs text-muted-foreground">Correct Answers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-amber-500/10">
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{user.credits}</p>
                <p className="text-xs text-muted-foreground">Total Credits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{user.currentLevel}</p>
                <p className="text-xs text-muted-foreground">Current Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Complete lessons to earn achievements!
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-md border ${
                    achievement.earned 
                      ? "bg-amber-500/5 border-amber-500/20" 
                      : "bg-muted/30 opacity-50"
                  }`}
                  data-testid={`achievement-${achievement.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      achievement.earned 
                        ? "bg-amber-500/20" 
                        : "bg-muted"
                    }`}>
                      <Award className={`h-5 w-5 ${
                        achievement.earned 
                          ? "text-amber-500" 
                          : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-40 w-full" />
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>

      <Skeleton className="h-64 w-full" />
    </div>
  );
}
