import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Coins, Calendar, BarChart3, Eye } from "lucide-react";
import { getUsageStats, UsageStats } from '@/services/aiUsageService';
import { TokenUsageModal } from './TokenUsageModal';

export function TokenUsageStats() {
    const [stats, setStats] = useState<UsageStats>({
        totalCost: 0,
        todayCost: 0,
        monthCost: 0,
        totalTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0
    });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        const data = await getUsageStats();
        setStats(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(amount);
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Today's Cost</p>
                            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.todayCost)}</h3>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <Coins className="w-6 h-6 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">This Month</p>
                            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.monthCost)}</h3>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Usage</p>
                            <div className="flex flex-col">
                                <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalCost)}</h3>
                                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                    <div className="flex justify-between gap-4">
                                        <span>Total Tokens:</span>
                                        <span className="font-mono">{stats.totalTokens.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between gap-4 text-slate-400">
                                        <span>Input:</span>
                                        <span className="font-mono">{stats.totalInputTokens.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between gap-4 text-slate-400">
                                        <span>Output:</span>
                                        <span className="font-mono">{stats.totalOutputTokens.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 items-start">
                            <Button variant="outline" size="icon" onClick={() => setIsModalOpen(true)} title="View Details">
                                <Eye className="w-4 h-4" />
                            </Button>
                            <div className="bg-purple-100 p-3 rounded-full">
                                <BarChart3 className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <TokenUsageModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
