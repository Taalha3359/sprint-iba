"use client";

import AIStudyPlanner from "@/components/AIStudyPlanner";
import StudyCalendar from "@/components/study-plan/StudyCalendar";
import DailyGoalsChecklist from "@/components/study-plan/DailyGoalsChecklist";
import StudyProgressTracker from "@/components/study-plan/StudyProgressTracker";

const StudyPlan = () => {
    return (
        <div className="max-w-7xl mx-auto w-full">
            <h1 className="text-3xl font-bold mb-8">Study Plan</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <AIStudyPlanner />
                </div>
                <div className="space-y-8">
                    <StudyCalendar />
                    <DailyGoalsChecklist />
                    <StudyProgressTracker />
                </div>
            </div>
        </div>
    );
};

export default StudyPlan;
