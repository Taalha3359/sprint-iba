import PublicProfileClient from "@/components/profile/PublicProfileClient";

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params;
    return <PublicProfileClient userId={userId} />;
}
