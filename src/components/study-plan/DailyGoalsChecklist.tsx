"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const goals = [
    { id: "goal1", label: "Complete 2 Math Modules" },
    { id: "goal2", label: "Read 1 English Article" },
    { id: "goal3", label: "Practice 20 Vocabulary Words" },
];

export default function DailyGoalsChecklist() {
    return (
        <Card className="border-border/40">
            <CardHeader>
                <CardTitle className="text-lg">Daily Goals</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {goals.map((goal) => (
                        <div key={goal.id} className="flex items-center space-x-2">
                            <Checkbox id={goal.id} />
                            <Label htmlFor={goal.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {goal.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
