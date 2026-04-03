import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Home, BarChart3, User, Coins, Settings, Trophy, BookMarked, BookOpen, Check, Lock } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "My Plan", url: "/plan", icon: BookMarked },
  { title: "Progress", url: "/progress", icon: BarChart3 },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Admin", url: "/admin", icon: Settings },
];

type TopicInfo = {
  id: string;
  title: string;
  lessonCount: number;
  completedLessons: number;
  isLocked: boolean;
};

type AppSidebarProps = {
  credits?: number;
};

export function AppSidebar({ credits = 0 }: AppSidebarProps) {
  const [location] = useLocation();

  const { data: topicsData } = useQuery<{ topics: TopicInfo[] }>({
    queryKey: ["/api/topics"],
    staleTime: 30000,
  });

  const topics = topicsData?.topics ?? [];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">L</span>
            </div>
            <span className="font-bold text-lg">LearnEasy</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Topics list */}
        {topics.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-2 mb-1">
              Topics ({topics.filter(t => !t.isLocked).length} unlocked)
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {topics.map((topic) => {
                  const isComplete = topic.lessonCount > 0 && topic.completedLessons >= topic.lessonCount;
                  const pct = topic.lessonCount > 0
                    ? Math.round((topic.completedLessons / topic.lessonCount) * 100)
                    : 0;
                  const isActive = location === `/topics/${topic.id}`;

                  return (
                    <SidebarMenuItem key={topic.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={topic.isLocked ? "opacity-50" : ""}
                      >
                        <Link href={topic.isLocked ? "#" : `/topics/${topic.id}`}>
                          <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                            {topic.isLocked ? (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : isComplete ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <BookOpen className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">{topic.title}</span>
                            {!topic.isLocked && topic.lessonCount > 0 && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Progress value={pct} className="h-1 flex-1" />
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                  {topic.completedLessons}/{topic.lessonCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between p-3 rounded-md bg-sidebar-accent">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Credits</span>
          </div>
          <Badge variant="secondary" data-testid="sidebar-credits">
            {credits}
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
