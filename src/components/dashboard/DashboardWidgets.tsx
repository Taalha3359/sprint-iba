"use client";

import StudyProgress from "./StudyProgress";
import UpcomingTasks from "./UpcomingTasks";
import RecentActivity from "./RecentActivity";
import MistakesOverview from "./MistakesOverview";

export default function DashboardWidgets() {
    return (
        <div className="space-y-8 mb-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            {/* Top Row: Small Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StudyProgress />
                <UpcomingTasks />
                <RecentActivity />
            </div>

            {/* Bottom Row: Full Width Mistakes Overview */}
            <MistakesOverview />
        </div>
    );
}
