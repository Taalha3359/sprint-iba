"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface SkillsInterestsProps {
    initialSkills?: string[];
    isEditing: boolean;
}

export default function SkillsInterests({ initialSkills = [], isEditing }: SkillsInterestsProps) {
    const [skills, setSkills] = useState<string[]>(initialSkills.length > 0 ? initialSkills : ["Mathematics", "Physics", "Debate"]);
    const [newSkill, setNewSkill] = useState("");

    const handleAddSkill = () => {
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill("");
        } else if (skills.includes(newSkill.trim())) {
            toast.error("Skill already exists");
        }
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        setSkills(skills.filter((skill) => skill !== skillToRemove));
    };

    return (
        <Card className="border-border/40">
            <CardHeader>
                <CardTitle className="text-lg">Skills & Interests</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                    {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-1">
                            {skill}
                            {isEditing && (
                                <button onClick={() => handleRemoveSkill(skill)} className="hover:text-destructive">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </Badge>
                    ))}
                </div>
                {isEditing && (
                    <div className="flex gap-2">
                        <Input
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            placeholder="Add a skill..."
                            className="max-w-xs"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddSkill();
                                }
                            }}
                        />
                        <Button size="icon" variant="outline" onClick={handleAddSkill}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
