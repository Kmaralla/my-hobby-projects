import { Check } from "lucide-react";

type LessonProgressProps = {
  current: number;
  total: number;
  answeredCorrectly: boolean[];
};

export function LessonProgress({ current, total, answeredCorrectly }: LessonProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => {
        const isCompleted = index < current;
        const isCurrent = index === current;
        const wasCorrect = answeredCorrectly[index];

        return (
          <div
            key={index}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              isCompleted
                ? wasCorrect
                  ? "bg-emerald-500"
                  : "bg-amber-500"
                : isCurrent
                ? "bg-primary"
                : "bg-muted"
            }`}
            data-testid={`progress-step-${index}`}
          />
        );
      })}
    </div>
  );
}

export function LessonSidebar({
  lessons,
  currentLessonIndex,
  completedLessons,
}: {
  lessons: { id: string; title: string }[];
  currentLessonIndex: number;
  completedLessons: string[];
}) {
  return (
    <div className="space-y-2">
      {lessons.map((lesson, index) => {
        const isCompleted = completedLessons.includes(lesson.id);
        const isCurrent = index === currentLessonIndex;

        return (
          <div
            key={lesson.id}
            className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
              isCurrent
                ? "bg-primary/10 text-primary"
                : isCompleted
                ? "text-muted-foreground"
                : "text-muted-foreground/60"
            }`}
            data-testid={`sidebar-lesson-${lesson.id}`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                isCompleted
                  ? "bg-emerald-500 text-white"
                  : isCurrent
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
            </div>
            <span className="text-sm truncate">{lesson.title}</span>
          </div>
        );
      })}
    </div>
  );
}
