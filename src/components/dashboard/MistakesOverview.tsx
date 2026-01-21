"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, ArrowRight, Target, Clock, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMistakes } from "@/hooks/useMistakes";
import { MarkdownText } from "@/components/MarkdownText";

export default function MistakesOverview() {
    const router = useRouter();
    const { analytics, mistakes, loading, fetchAnalytics, fetchMistakes } = useMistakes();

    // useMistakes hook automatically fetches data on mount


    if (loading && !analytics) {
        return (
            <Card className="border-border/40 card-hover-glow h-[300px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Brain className="w-8 h-8 animate-pulse text-primary/50" />
                    <p>Loading insights...</p>
                </div>
            </Card>
        );
    }

    // Get top 3 weak topics
    const weakAreas = analytics
        ? Object.entries(analytics.mistakesByTopic)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
        : [];

    const recentMistakes = mistakes.slice(0, 4);

    return (
        <Card className="border-border/40 card-hover-glow overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            Mistake Insights & Recovery
                        </CardTitle>
                        <CardDescription>
                            Analyze your recent performance and focus on weak areas
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/oops-list')}
                        className="hidden sm:flex"
                    >
                        View All Mistakes <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/40">

                    {/* Left Column: Stats & Weak Areas */}
                    <div className="p-6 space-y-6 bg-gradient-to-b from-transparent to-primary/5">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-background border border-border/50 shadow-sm">
                                <div className="text-sm text-muted-foreground mb-1">Total Mistakes</div>
                                <div className="text-3xl font-bold text-foreground">
                                    {analytics?.totalMistakes || 0}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-background border border-orange-500/20 shadow-sm">
                                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                                    High Priority
                                </div>
                                <div className="text-3xl font-bold text-orange-500">
                                    {analytics?.highPriorityCount || 0}
                                </div>
                            </div>
                        </div>

                        {/* Weak Areas List */}
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Focus Areas
                            </h3>
                            {weakAreas.length > 0 ? (
                                <div className="space-y-3">
                                    {weakAreas.map(([topic, count], index) => (
                                        <div key={topic} className="group flex items-center justify-between p-3 rounded-lg bg-background border border-border/50 hover:border-primary/30 transition-all">
                                            <div>
                                                <div className="font-medium text-sm">{topic}</div>
                                                <div className="text-xs text-muted-foreground">{count} mistakes</div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8"
                                                onClick={() => router.push(`/practice?mode=mistakes&topic=${encodeURIComponent(topic)}`)}
                                            >
                                                Practice
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground italic py-2">
                                    No specific weak areas identified yet.
                                </div>
                            )}
                        </div>

                        {weakAreas.length > 0 && (
                            <Button
                                className="w-full gradient-primary"
                                onClick={() => router.push(`/practice?mode=mistakes&topic=${encodeURIComponent(weakAreas[0][0])}`)}
                            >
                                <Zap className="w-4 h-4 mr-2" />
                                Fix Weakest Area
                            </Button>
                        )}
                    </div>

                    {/* Right Column: Recent Mistakes */}
                    <div className="lg:col-span-2 p-6">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Recent Mistakes
                        </h3>

                        {recentMistakes.length > 0 ? (
                            <div className="space-y-4">
                                {recentMistakes.map((mistake) => (
                                    <div
                                        key={mistake.id}
                                        className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors cursor-pointer group"
                                        onClick={() => router.push('/oops-list')}
                                    >
                                        <div className="shrink-0 mt-1">
                                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold text-xs">
                                                {mistake.user_answer || "?"}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                                    {mistake.topic}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(mistake.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-sm line-clamp-2 text-foreground/90 mb-1">
                                                <MarkdownText text={mistake.question?.question_text || ''} />
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                                Review Question <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-center">
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                                    <Brain className="w-6 h-6 text-green-500" />
                                </div>
                                <h4 className="font-medium mb-1">No Recent Mistakes</h4>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Great job! You haven't made any mistakes recently. Keep up the good work!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
