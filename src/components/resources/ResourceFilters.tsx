"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

const categories = ["All", "Mathematics", "English", "Analytical Ability", "General Knowledge"];

export default function ResourceFilters() {
    return (
        <div className="space-y-4 mb-8">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input placeholder="Search resources..." className="pl-9" />
                </div>
                <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                </Button>
            </div>
            <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                    <Button key={category} variant="secondary" size="sm" className="rounded-full">
                        {category}
                    </Button>
                ))}
            </div>
        </div>
    );
}
