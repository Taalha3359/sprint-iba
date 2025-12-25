"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const myGroups = [
    { id: 1, name: "General Discussion", unread: 5, image: "" },
    { id: 2, name: "Vocabulary Practice", unread: 0, image: "" },
];

export default function MyGroups() {
    return (
        <Card className="border-border/40">
            <CardHeader>
                <CardTitle className="text-lg">My Groups</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {myGroups.map((group) => (
                        <div key={group.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10 rounded-lg">
                                    <AvatarImage src={group.image} />
                                    <AvatarFallback className="rounded-lg">{group.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{group.name}</p>
                                    {group.unread > 0 && (
                                        <p className="text-xs text-primary font-medium">{group.unread} new messages</p>
                                    )}
                                </div>
                            </div>
                            <Button size="icon" variant="ghost">
                                <MessageCircle className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
