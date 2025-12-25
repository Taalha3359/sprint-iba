"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

const suggestions = [
    { id: 1, name: "Alex Johnson", mutual: 3, avatar: "" },
    { id: 2, name: "Maria Garcia", mutual: 5, avatar: "" },
    { id: 3, name: "David Kim", mutual: 1, avatar: "" },
];

export default function FriendSuggestions() {
    return (
        <Card className="border-border/40">
            <CardHeader>
                <CardTitle className="text-lg">Suggested Friends</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {suggestions.map((user) => (
                        <div key={user.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.mutual} mutual friends</p>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10">
                                <UserPlus className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
