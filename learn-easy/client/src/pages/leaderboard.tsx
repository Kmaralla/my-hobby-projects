import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Trophy, Flame, Target, Zap, CheckCircle2, BookOpen, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  credits: number;
  streak: number;
  accuracy: number;
  completedTopics: number;
  avgCompletion: number;
  dailyGoalProgress: number;
  score: number;
};

type LeaderboardResponse = {
  generatedAt: string;
  entries: LeaderboardEntry[];
};

type TopicInfo = { id: string; title: string };

type TopicLeaderboard = {
  entries: Array<{
    rank: number;
    username: string;
    completionPercentage: number;
    expertiseLevel: string;
    streak: number;
  }>;
  totalLearners: number;
};

function rankEmoji(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function LeaderboardPage() {
  const [, setLocation] = useLocation();
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  const { data, isLoading } = useQuery<LeaderboardResponse>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 30000,
  });

  const { data: topicsData } = useQuery<{ topics: TopicInfo[] }>({
    queryKey: ["/api/topics"],
  });

  const { data: topicLeaderboard, isLoading: topicLoading } = useQuery<TopicLeaderboard>({
    queryKey: [`/api/topics/${selectedTopicId}/leaderboard`],
    enabled: !!selectedTopicId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const topics = topicsData?.topics?.filter((t) => !(t as any).isLocked) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold">Learning Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            Compete globally or see who's mastered a specific topic.
          </p>
        </div>
      </div>

      <Tabs defaultValue="global">
        <TabsList className="w-full">
          <TabsTrigger value="global" className="flex-1">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Global
          </TabsTrigger>
          <TabsTrigger value="topic" className="flex-1">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            By Topic
          </TabsTrigger>
        </TabsList>

        {/* Global leaderboard */}
        <TabsContent value="global" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Learners</CardTitle>
              <p className="text-xs text-muted-foreground">
                Score = completed topics × 1000 + avg mastery × 10 + accuracy × 5 + credits + streak × 20
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.entries?.length ? (
                data.entries.map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${
                      entry.rank <= 3 ? "bg-amber-500/5 border-amber-500/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-8 text-center">{rankEmoji(entry.rank)}</span>
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {entry.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{entry.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.completedTopics} topics · {entry.avgCompletion}% mastery
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <Target className="h-2.5 w-2.5" />
                        {entry.accuracy}%
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <Flame className="h-2.5 w-2.5" />
                        {entry.streak}d
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <Zap className="h-2.5 w-2.5" />
                        {entry.credits}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px] font-semibold">
                        {entry.score.toLocaleString()} pts
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No rankings yet. Start learning to appear here!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per-topic leaderboard */}
        <TabsContent value="topic" className="mt-4 space-y-4">
          <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a topic to see its leaderboard..." />
            </SelectTrigger>
            <SelectContent>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTopicId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  {topics.find((t) => t.id === selectedTopicId)?.title}
                  {topicLeaderboard && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {topicLeaderboard.totalLearners} learners
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topicLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : !topicLeaderboard || topicLeaderboard.entries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No one has started this topic yet.</p>
                    <p className="text-xs">Be the first — claim the #1 spot!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topicLeaderboard.entries.map((entry) => (
                      <div
                        key={entry.rank}
                        className={`flex items-center gap-3 p-3 rounded-md border ${
                          entry.rank === 1 ? "bg-amber-500/5 border-amber-500/20" : ""
                        }`}
                      >
                        <span className="text-base w-8 text-center">{rankEmoji(entry.rank)}</span>
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {entry.username[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.username}</p>
                          <p className="text-xs text-muted-foreground capitalize">{entry.expertiseLevel}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">{entry.completionPercentage}%</p>
                          <p className="text-xs text-muted-foreground">{entry.streak}🔥 streak</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedTopicId && topics.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No unlocked topics yet. Keep learning to unlock more!
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
