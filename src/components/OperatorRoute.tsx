"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export const OperatorRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const [isOperator, setIsOperator] = useState<boolean | null>(null);
    const [checkingRole, setCheckingRole] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkRole = async () => {
            if (!user) {
                setCheckingRole(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error("Error checking role:", error);
                    setIsOperator(false);
                } else {
                    setIsOperator(data?.role === 'operator');
                }
            } catch (err) {
                console.error("Exception checking role:", err);
                setIsOperator(false);
            } finally {
                setCheckingRole(false);
            }
        };

        if (!loading) {
            checkRole();
        }
    }, [user, loading]);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/operator/login");
        } else if (!loading && !checkingRole && isOperator === false) {
            // If not operator, maybe redirect to home or show access denied
            // For now, let's render the access denied view which is handled below
        }
    }, [user, loading, checkingRole, isOperator, router]);


    if (loading || checkingRole) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null; // Redirecting
    }

    if (!isOperator) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p>You do not have operator privileges.</p>
                <button
                    onClick={() => router.push("/")}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    Go Home
                </button>
            </div>
        );
    }

    return <>{children}</>;
};
