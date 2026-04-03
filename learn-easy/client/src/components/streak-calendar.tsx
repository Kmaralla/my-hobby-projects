type StreakCalendarProps = {
  activeDays: number[];
  currentStreak: number;
};

export function StreakCalendar({ activeDays, currentStreak }: StreakCalendarProps) {
  const today = new Date().getDay();
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">This Week</span>
        <span className="text-sm font-medium" data-testid="text-streak-count">
          {currentStreak} day streak
        </span>
      </div>
      <div className="flex gap-1.5">
        {days.map((day, index) => {
          const isActive = activeDays.includes(index);
          const isToday = index === today;

          return (
            <div
              key={index}
              className={`flex-1 aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-muted text-foreground ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "bg-muted/50 text-muted-foreground"
              }`}
              data-testid={`calendar-day-${index}`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
