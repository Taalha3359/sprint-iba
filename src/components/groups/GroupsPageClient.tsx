"use client";

import { Card, CardContent } from "@/components/ui/card";
import FeaturedGroups from "@/components/groups/FeaturedGroups";
import CreateGroupModal from "@/components/groups/CreateGroupModal";
import MyGroups from "@/components/groups/MyGroups";

const GroupsPageClient = () => {
    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Groups</h1>
                <CreateGroupModal />
            </div>

            <div className="space-y-8">
                <FeaturedGroups />
                <MyGroups />
            </div>
        </div>
    );
};

export default GroupsPageClient;
