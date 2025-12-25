"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const featuredGroups = [
    { id: 1, name: "Math Olympiad Prep", members: 120, image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=60" },
    { id: 2, name: "English Debate Club", members: 85, image: "https://images.unsplash.com/photo-1577985051167-0d49eec21977?w=800&auto=format&fit=crop&q=60" },
    { id: 3, name: "Physics Enthusiasts", members: 95, image: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=60" },
];

export default function FeaturedGroups() {
    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Featured Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredGroups.map((group) => (
                    <Card key={group.id} className="overflow-hidden border-border/40 card-hover-glow group cursor-pointer">
                        <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${group.image})` }} />
                        <CardContent className="p-4">
                            <h3 className="font-bold text-lg mb-1">{group.name}</h3>
                            <div className="flex items-center justify-between text-muted-foreground text-sm">
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" /> {group.members} members
                                </span>
                                <Button size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    Join
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
