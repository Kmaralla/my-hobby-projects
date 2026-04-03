import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TheorySectionProps = {
  title: string;
  content: string;
  onContinue: () => void;
};

export function TheorySection({ title, content, onContinue }: TheorySectionProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const paragraphs = content.split("\n\n");
  const mainContent = paragraphs.slice(0, -1).join("\n\n");
  const deepDiveContent = paragraphs[paragraphs.length - 1];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <BookOpen className="h-4 w-4" />
          <span>Theory</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-lesson-title">
          {title}
        </h1>
      </div>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <div 
          className="text-foreground leading-relaxed whitespace-pre-wrap"
          data-testid="text-theory-content"
        >
          {mainContent}
        </div>
      </div>

      {deepDiveContent && (
        <Card className="overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === "deep-dive" ? null : "deep-dive")}
            className="w-full p-4 flex items-center justify-between text-left hover-elevate"
            data-testid="button-deep-dive"
          >
            <span className="font-medium">Deep Dive</span>
            <motion.div
              animate={{ rotate: expandedSection === "deep-dive" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </button>
          <AnimatePresence>
            {expandedSection === "deep-dive" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 pb-4 px-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {deepDiveContent}
                  </p>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={onContinue} data-testid="button-start-questions">
          Start Questions
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
