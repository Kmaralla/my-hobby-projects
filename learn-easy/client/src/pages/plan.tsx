import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { BookOpen, Target, Calendar, Clock, Check, Lock, Sparkles, Save, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TopicInfo = {
  id: string;
  title: string;
  description: string;
  lessonCount: number;
  completedLessons: number;
  isLocked: boolean;
  unlocksOnDay?: number;
};

type LearningPlan = {
  id: string;
  name: string;
  topicIds: string[];
  weeklyGoalMinutes: number;
  targetDate: string | null;
  notes: string | null;
};

const GOAL_OPTIONS = [
  { label: "15 min / week", value: 15 },
  { label: "30 min / week", value: 30 },
  { label: "1 hr / week", value: 60 },
  { label: "2 hrs / week", value: 120 },
  { label: "5 hrs / week", value: 300 },
];

export default function PlanPage() {
  const { toast } = useToast();
  const { data: plan, isLoading: planLoading } = useQuery<LearningPlan | null>({
    queryKey: ["/api/learning-plan"],
  });
  const { data: topicsData } = useQuery<{ topics: TopicInfo[] }>({
    queryKey: ["/api/topics"],
  });

  const [name, setName] = useState("My Learning Plan");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(60);
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  // Populate form from saved plan
  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setSelectedTopicIds(plan.topicIds);
      setWeeklyGoal(plan.weeklyGoalMinutes);
      setTargetDate(plan.targetDate ? plan.targetDate.split("T")[0] : "");
      setNotes(plan.notes || "");
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/learning-plan", {
        name,
        topicIds: selectedTopicIds,
        weeklyGoalMinutes: weeklyGoal,
        targetDate: targetDate || null,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-plan"] });
      toast({ title: "Plan saved!", description: "Your learning plan has been updated." });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const topics = topicsData?.topics || [];
  const selectedTopics = topics.filter((t) => selectedTopicIds.includes(t.id));
  const totalLessons = selectedTopics.reduce((s, t) => s + t.lessonCount, 0);
  const completedLessons = selectedTopics.reduce((s, t) => s + t.completedLessons, 0);
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Estimated weeks to complete based on weekly goal (assume 5 min per lesson)
  const remainingLessons = totalLessons - completedLessons;
  const minutesPerLesson = 5;
  const weeksEstimate =
    weeklyGoal > 0 && remainingLessons > 0
      ? Math.ceil((remainingLessons * minutesPerLesson) / weeklyGoal)
      : 0;

  if (planLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          My Learning Plan
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pick topics, set a weekly goal, and track your path — like a LeetCode study plan for anything.
        </p>
      </div>

      {/* Plan name */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <label className="text-sm font-medium">Plan Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. AI Fundamentals Sprint"
          />
        </CardContent>
      </Card>

      {/* Progress summary (only if topics selected) */}
      {selectedTopicIds.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Plan Progress
              </p>
              <Badge variant="secondary">{overallProgress}% complete</Badge>
            </div>
            <Progress value={overallProgress} className="h-2 mb-3" />
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="rounded border p-2">
                <p className="text-muted-foreground">Topics</p>
                <p className="font-semibold">{selectedTopicIds.length}</p>
              </div>
              <div className="rounded border p-2">
                <p className="text-muted-foreground">Lessons done</p>
                <p className="font-semibold">
                  {completedLessons}/{totalLessons}
                </p>
              </div>
              <div className="rounded border p-2">
                <p className="text-muted-foreground">Est. weeks</p>
                <p className="font-semibold">{weeksEstimate > 0 ? `~${weeksEstimate}w` : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topic selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Select Topics ({selectedTopicIds.length} selected)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {topics.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No topics available yet. Ask an admin to add content.
            </p>
          )}
          {topics.map((topic) => {
            const isSelected = selectedTopicIds.includes(topic.id);
            const isComplete = topic.completedLessons >= topic.lessonCount && topic.lessonCount > 0;

            return (
              <div
                key={topic.id}
                onClick={() => !topic.isLocked && toggleTopic(topic.id)}
                className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  topic.isLocked
                    ? "opacity-50 cursor-not-allowed bg-muted/30"
                    : isSelected
                      ? "bg-primary/10 border-primary/30"
                      : "hover:bg-muted/50"
                }`}
              >
                {topic.isLocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleTopic(topic.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{topic.title}</span>
                    {isComplete && (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 flex-shrink-0">
                        <Check className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    )}
                    {topic.isLocked && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        Day {topic.unlocksOnDay}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {topic.completedLessons}/{topic.lessonCount}
                  </span>
                  {!topic.isLocked && topic.lessonCount > 0 && (
                    <Progress
                      value={(topic.completedLessons / topic.lessonCount) * 100}
                      className="h-1 mt-1 w-16"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Weekly goal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Weekly Learning Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={weeklyGoal === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setWeeklyGoal(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Target date + notes */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              Target Completion Date (optional)
            </label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Notes / Goal (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Preparing for ML interviews, building a RAG app, etc."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
      </Button>
    </div>
  );
}
