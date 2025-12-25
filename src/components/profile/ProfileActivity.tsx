"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Trophy, Star } from "lucide-react";

const activities = [
    {
        id: 1,
        type: "achievement",
        title: "Earned 'Math Whiz' Badge",
        date: "2 days ago",
        icon: Trophy,
        color: "text-yellow-500",
    },
    {
        id: 2,
        type: "study",
        title: "Completed Algebra Module",
        date: "3 days ago",
        icon: CheckCircle2,
        color: "text-green-500",
    },
    {
        id: 3,
        type: "social",
        title: "Joined 'Physics Enthusiasts' Group",
        date: "1 week ago",
        icon: Star,
        color: "text-blue-500",
    },
];

export default function ProfileActivity() {
    return (
        <Card className="border-border/40">
            <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative border-l border-border/50 ml-3 space-y-6">
                    {activities.map((activity) => (
                        <div key={activity.id} className="ml-6 relative">
                            <span className={`absolute -left-[31px] top-1 bg-background p-1 rounded-full border border-border ${activity.color}`}>
                                <activity.icon className="w-4 h-4" />
                            </span>
                            <div>
                                <p className="font-medium text-sm">{activity.title}</p>
                                <p className="text-xs text-muted-foreground">{activity.date}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
