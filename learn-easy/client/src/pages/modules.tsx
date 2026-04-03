import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleCard } from "@/components/module-card";
import { EmptyState } from "@/components/empty-state";
import type { Module } from "@shared/schema";

type ModulesData = {
  modules: (Module & { progress: { completed: number; total: number } })[];
};

export default function Modules() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<ModulesData>({
    queryKey: ["/api/modules"],
  });

  if (isLoading) {
    return <ModulesSkeleton />;
  }

  if (!data || data.modules.length === 0) {
    return (
      <EmptyState
        title="No Modules Available"
        description="Learning modules are being prepared. Check back soon!"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-modules-title">
          Learning Modules
        </h1>
        <p className="text-muted-foreground mt-1">
          Master AI concepts through interactive lessons
        </p>
      </div>

      <div className="space-y-4">
        {data.modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            progress={module.progress}
            onClick={() => setLocation(`/module/${module.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function ModulesSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}
