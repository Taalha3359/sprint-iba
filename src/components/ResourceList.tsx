"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, BookOpen, Video, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Resource {
    id: string;
    title: string;
    description: string;
    type: 'video' | 'article' | 'book';
    url: string;
    subject: string;
}

interface ResourceListProps {
    subject: string;
}

const ResourceList = ({ subject }: ResourceListProps) => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResources = async () => {
            setLoading(true);
            try {
                // Mock data for now if table doesn't exist or is empty
                // In a real app, you'd fetch from Supabase
                // const { data, error } = await supabase
                //     .from('resources')
                //     .select('*')
                //     .eq('subject', subject);

                // if (error) throw error;

                // Simulating fetch
                await new Promise(resolve => setTimeout(resolve, 500));

                const mockResources: Resource[] = [
                    {
                        id: '1',
                        title: `${subject.charAt(0).toUpperCase() + subject.slice(1)} Basics`,
                        description: `Introduction to ${subject} concepts.`,
                        type: 'article',
                        url: '#',
                        subject: subject
                    },
                    {
                        id: '2',
                        title: `Advanced ${subject.charAt(0).toUpperCase() + subject.slice(1)}`,
                        description: `Deep dive into ${subject}.`,
                        type: 'video',
                        url: '#',
                        subject: subject
                    }
                ];

                setResources(mockResources);
            } catch (error) {
                console.error("Error fetching resources:", error);
                toast.error("Failed to load resources");
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    }, [subject]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video className="w-5 h-5" />;
            case 'book': return <BookOpen className="w-5 h-5" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold capitalize">{subject} Resources</h1>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {resources.map((resource) => (
                    <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                {getIcon(resource.type)}
                                {resource.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">{resource.description}</p>
                            <Button className="w-full" asChild>
                                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Resource
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {resources.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                    No resources found for this subject.
                </div>
            )}
        </div>
    );
};

export default ResourceList;
