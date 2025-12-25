"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const subjects = [
    { name: "Mathematics", progress: 75 },
    { name: "English", progress: 60 },
    { name: "Analytical Ability", progress: 40 },
];

export default function StudyProgressTracker() {
    return (
        <Card className="border-border/40">
            <CardHeader>
                <CardTitle className="text-lg">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {subjects.map((subject) => (
                        <div key={subject.name} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">{subject.name}</span>
                                <span className="text-muted-foreground">{subject.progress}%</span>
                            </div>
                            <Progress value={subject.progress} className="h-2" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
