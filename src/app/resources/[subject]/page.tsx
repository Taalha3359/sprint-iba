"use client";

import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ResourceList from "@/components/ResourceList";
import { notFound } from "next/navigation";

const ResourcesPage = () => {
    const params = useParams();
    const subject = params.subject as string;

    const validSubjects = ["math", "english", "analytical"];

    if (!validSubjects.includes(subject)) {
        return notFound();
    }

    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <ResourceList subject={subject} />
            </div>
        </div>
    );
};

export default ResourcesPage;
