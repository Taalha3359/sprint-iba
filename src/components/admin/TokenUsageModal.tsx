import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getUsageLogs, UsageLog } from '@/services/aiUsageService';
import { format } from 'date-fns';

interface TokenUsageModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TokenUsageModal({ isOpen, onClose }: TokenUsageModalProps) {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const pageSize = 10;

    const fetchLogs = async () => {
        setLoading(true);
        const data = await getUsageLogs(pageSize, page * pageSize);
        setLogs(data);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen, page]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>AI Token Usage Details</DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Operation</TableHead>
                                <TableHead className="text-right">Input Tokens</TableHead>
                                <TableHead className="text-right">Output Tokens</TableHead>
                                <TableHead className="text-right">Cost ($)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No logs found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs text-slate-500">
                                            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                                        </TableCell>
                                        <TableCell className="font-medium text-xs">{log.model}</TableCell>
                                        <TableCell className="text-xs">
                                            {log.operation_type}
                                            {log.details?.fileName && (
                                                <span className="block text-slate-400 text-[10px] truncate max-w-[150px]">
                                                    {log.details.fileName}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">{log.input_tokens.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-xs">{log.output_tokens.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            ${Number(log.cost).toFixed(5)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0 || loading}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => p + 1)}
                            disabled={logs.length < pageSize || loading}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
