"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";

const tasks = [
    { id: 1, title: "Complete Math Module 3", due: "Today", completed: false },
    { id: 2, title: "Review Vocabulary List", due: "Tomorrow", completed: false },
    { id: 3, title: "Take Practice Quiz", due: "Wed, 28 Dec", completed: true },
];

export default function UpcomingTasks() {
    return (
        <Card className="col-span-1 border-border/40 card-hover-glow">
            <CardHeader>
                <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-3">
                            {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                                    {task.title}
                                </p>
                                <p className="text-xs text-muted-foreground">{task.due}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
