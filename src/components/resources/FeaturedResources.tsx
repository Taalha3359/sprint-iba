"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Video, FileText } from "lucide-react";

const featured = [
    { id: 1, title: "Complete Algebra Guide", type: "PDF", category: "Mathematics", icon: FileText },
    { id: 2, title: "Vocabulary Masterclass", type: "Video", category: "English", icon: Video },
    { id: 3, title: "IBA Past Papers 2020-2024", type: "Guide", category: "General", icon: BookOpen },
];

export default function FeaturedResources() {
    return (
        <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">Featured Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featured.map((resource) => (
                    <Card key={resource.id} className="border-border/40 card-hover-glow cursor-pointer">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <resource.icon className="w-6 h-6" />
                                </div>
                                <Badge variant="outline">{resource.category}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-lg mb-2">{resource.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{resource.type}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
