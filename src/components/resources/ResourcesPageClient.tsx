"use client";

import ResourceFilters from "@/components/resources/ResourceFilters";
import FeaturedResources from "@/components/resources/FeaturedResources";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const ResourcesPageClient = () => {
    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold mb-8">Study Resources</h1>

            <ResourceFilters />
            <FeaturedResources />

            <div>
                <h2 className="text-xl font-bold mb-4">All Resources</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Placeholder for resource categories/list */}
                    {["Mathematics", "English", "Analytical Ability", "General Knowledge"].map((subject) => (
                        <Card key={subject} className="border-border/40 card-hover-glow cursor-pointer hover:border-primary/50 transition-colors">
                            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <h3 className="font-semibold">{subject}</h3>
                                <p className="text-sm text-muted-foreground">Explore materials</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ResourcesPageClient;
