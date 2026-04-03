import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  BookOpen, Trophy, MessageCircle, ArrowLeft, Check, Lock,
  Send, Users, Sparkles, ChevronRight, Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TopicDetail = {
  topic: {
    id: string;
    title: string;
    description: string | null;
    unlockDay: number;
    isActive: boolean;
  };
  concepts: Array<{
    id: string;
    title: string;
    keyTakeaway: string;
    difficulty: string;
    order: number;
  }>;
  progress: {
    completionPercentage: number;
    completedLessons: number;
    totalLessons: number;
    expertiseLevel: string;
  } | null;
};

type Comment = {
  id: string;
  username: string;
  content: string;
  createdAt: string;
};

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

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-primary/10 text-primary border-primary/30",
  intermediate: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  advanced: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

export default function TopicPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const initialTab = new URLSearchParams(window.location.search).get("tab") || "curriculum";

  const { data, isLoading } = useQuery<TopicDetail>({
    queryKey: [`/api/topics/${id}/detail`],
    enabled: !!id,
  });

  const { data: comments, refetch: refetchComments } = useQuery<Comment[]>({
    queryKey: [`/api/topics/${id}/comments`],
    enabled: !!id,
  });

  const { data: leaderboard } = useQuery<TopicLeaderboard>({
    queryKey: [`/api/topics/${id}/leaderboard`],
    enabled: !!id,
  });

  const postCommentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/topics/${id}/comments`, { content: commentText });
    },
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["/api/topics/comment-counts"] });
    },
    onError: () => toast({ title: "Failed to post", variant: "destructive" }),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  const { topic, concepts, progress } = data;
  const completionPct = progress?.completionPercentage ?? 0;
  const completedCount = progress?.completedLessons ?? 0;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Learn
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{topic.title}</h1>
            {topic.description && (
              <p className="text-muted-foreground text-sm mt-1">{topic.description}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={completionPct >= 100 ? "text-emerald-600 border-emerald-300" : ""}
          >
            {completionPct >= 100 ? "✓ Completed" : `${completionPct}%`}
          </Badge>
        </div>

        {completionPct > 0 && completionPct < 100 && (
          <Progress value={completionPct} className="h-2 mt-3" />
        )}

        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {concepts.length} concepts
          </span>
          {leaderboard && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {leaderboard.totalLearners} learning this
            </span>
          )}
          {progress?.expertiseLevel && (
            <Badge variant="outline" className="capitalize text-xs">
              {progress.expertiseLevel}
            </Badge>
          )}
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={async () => {
        await apiRequest("POST", "/api/select-topic", { topicId: id });
        queryClient.invalidateQueries({ queryKey: ["/api/learn"] });
        setLocation("/");
      }}>
        <Sparkles className="h-4 w-4 mr-2" />
        {completionPct > 0 ? "Continue Learning" : "Start Learning"}
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>

      <Tabs defaultValue={initialTab}>
        <TabsList className="w-full">
          <TabsTrigger value="curriculum" className="flex-1">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Curriculum
          </TabsTrigger>
          <TabsTrigger value="community" className="flex-1">
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Community {comments && comments.length > 0 ? `(${comments.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex-1">
            <Trophy className="h-3.5 w-3.5 mr-1.5" />
            Top Learners
          </TabsTrigger>
        </TabsList>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              {concepts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No concepts yet. Add content via Admin to generate lessons.
                </p>
              )}
              {concepts.map((concept, idx) => {
                const isDone = idx < completedCount;
                return (
                  <div
                    key={concept.id}
                    className={`flex items-start gap-3 p-3 rounded-md border ${
                      isDone ? "bg-emerald-500/5 border-emerald-500/20" : "bg-background"
                    }`}
                  >
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{concept.title}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize flex-shrink-0 ${DIFFICULTY_COLORS[concept.difficulty] || ""}`}
                        >
                          {concept.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {concept.keyTakeaway}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Community Tab */}
        <TabsContent value="community" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Learner insights & notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !postCommentMutation.isPending && postCommentMutation.mutate()}
                  placeholder="Share an insight about this topic..."
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => postCommentMutation.mutate()}
                  disabled={!commentText.trim() || postCommentMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {!comments || comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No insights yet.</p>
                    <p className="text-xs">Be the first to share what you learned!</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-md border bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {c.username[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold">{c.username}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top learners on this topic
                {leaderboard && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {leaderboard.totalLearners} total
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!leaderboard || leaderboard.entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No learners yet.</p>
                  <p className="text-xs">Start learning to claim the top spot!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.entries.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-3 p-3 rounded-md border ${
                        entry.rank === 1 ? "bg-amber-500/5 border-amber-500/20" : "bg-background"
                      }`}
                    >
                      <span className={`w-6 text-center text-sm font-bold ${
                        entry.rank === 1 ? "text-amber-500" :
                        entry.rank === 2 ? "text-slate-400" :
                        entry.rank === 3 ? "text-amber-700" : "text-muted-foreground"
                      }`}>
                        {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {entry.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">{entry.expertiseLevel}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold">{entry.completionPercentage}%</p>
                        <p className="text-xs text-muted-foreground">{entry.streak}🔥</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
