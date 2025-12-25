"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const activities = [
    {
        id: 1,
        user: "You",
        action: "completed",
        target: "Algebra Quiz",
        time: "2 hours ago",
        avatar: "/placeholder-user.jpg",
    },
    {
        id: 2,
        user: "Sarah",
        action: "joined",
        target: "Math Study Group",
        time: "4 hours ago",
        avatar: "/placeholder-user.jpg",
    },
    {
        id: 3,
        user: "You",
        action: "earned",
        target: "Speedster Badge",
        time: "Yesterday",
        avatar: "/placeholder-user.jpg",
    },
];

export default function RecentActivity() {
    return (
        <Card className="col-span-1 border-border/40 card-hover-glow">
            <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={activity.avatar} />
                                <AvatarFallback>{activity.user[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="text-sm">
                                    <span className="font-medium">{activity.user}</span>{" "}
                                    <span className="text-muted-foreground">{activity.action}</span>{" "}
                                    <span className="font-medium text-primary">{activity.target}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{activity.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
