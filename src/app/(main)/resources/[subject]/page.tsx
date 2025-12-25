import ResourceList from "@/components/ResourceList";
import { notFound } from "next/navigation";

const validSubjects = ["math", "english", "analytical"];

export async function generateStaticParams() {
    return validSubjects.map((subject) => ({
        subject: subject,
    }));
}

export default async function ResourcesPage({ params }: { params: Promise<{ subject: string }> }) {
    const { subject } = await params;

    if (!validSubjects.includes(subject)) {
        return notFound();
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <ResourceList subject={subject} />
        </div>
    );
}
