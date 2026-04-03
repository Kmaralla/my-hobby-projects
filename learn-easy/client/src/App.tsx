import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Progress from "@/pages/progress";
import Profile from "@/pages/profile";
import AdminPage from "@/pages/admin";
import LeaderboardPage from "@/pages/leaderboard";
import PlanPage from "@/pages/plan";
import TopicPage from "@/pages/topic";
import { isSupabaseClientConfigured, syncSupabaseSessionToApi } from "@/lib/supabase";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/progress" component={Progress} />
      <Route path="/profile" component={Profile} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/plan" component={PlanPage} />
      <Route path="/topics/:id" component={TopicPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const { data: userData } = useQuery<{ credits: number }>({
    queryKey: ["/api/user/credits"],
  });

  const style = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3.5rem",
  };

  const isLearningPage = location === "/";
  const isAdminPage = location === "/admin";

  useEffect(() => {
    if (!isSupabaseClientConfigured) return;
    syncSupabaseSessionToApi().catch((error) => {
      console.warn("Supabase session sync skipped:", error);
    });
  }, []);

  if (isAdminPage) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar credits={userData?.credits || 0} />
        <div className="flex flex-col flex-1 min-w-0">
          {!isLearningPage && (
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur px-4 sm:px-6">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
          )}
          <main className={`flex-1 overflow-auto ${isLearningPage ? "" : "p-4 sm:p-6 lg:p-8"}`}>
            {isLearningPage ? (
              <Router />
            ) : (
              <div className="max-w-4xl mx-auto">
                <Router />
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
