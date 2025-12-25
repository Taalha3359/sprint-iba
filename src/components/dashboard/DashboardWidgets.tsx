"use client";

import StudyProgress from "./StudyProgress";
import UpcomingTasks from "./UpcomingTasks";
import RecentActivity from "./RecentActivity";

export default function DashboardWidgets() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <StudyProgress />
            <UpcomingTasks />
            <RecentActivity />
        </div>
    );
}
