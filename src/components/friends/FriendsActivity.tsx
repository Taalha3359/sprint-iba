"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const activities = [
    { id: 1, user: "Sarah", action: "completed a quiz", time: "10m ago", avatar: "" },
    { id: 2, user: "Mike", action: "earned a badge", time: "1h ago", avatar: "" },
    { id: 3, user: "Emily", action: "joined a group", time: "2h ago", avatar: "" },
];

export default function FriendsActivity() {
    return (
        <Card className="border-border/40">
            <CardHeader>
                <CardTitle className="text-lg">Friends Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={activity.avatar} />
                                <AvatarFallback>{activity.user[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm">
                                    <span className="font-medium">{activity.user}</span> {activity.action}
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
