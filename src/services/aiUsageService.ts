import { supabase } from '@/integrations/supabase/client';

// Pricing configuration (USD per 1M tokens)
// You can update these rates as needed
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 }, // Legacy
    'gemini-2.0-flash-lite-preview-02-05': { input: 0.075, output: 0.30 },
    'gemini-2.0-flash-exp': { input: 0.075, output: 0.30 },
    'gemini-2.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
    'gemini-1.5-pro': { input: 3.50, output: 10.50 },
    'default': { input: 0.10, output: 0.40 } // Fallback
};

export interface UsageLog {
    id: string;
    created_at: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost: number;
    operation_type: string;
    details?: any;
}

export interface UsageStats {
    totalCost: number;
    todayCost: number;
    monthCost: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
}

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
}

/**
 * Log AI usage to the database
 */
export async function logAiUsage(
    model: string,
    inputTokens: number,
    outputTokens: number,
    operationType: string,
    details: any = {}
): Promise<void> {
    const cost = calculateCost(model, inputTokens, outputTokens);

    const { error } = await supabase.from('ai_usage_logs' as any).insert({
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost,
        operation_type: operationType,
        details
    });

    if (error) {
        console.error('Failed to log AI usage:', error);
    }
}

/**
 * Fetch usage statistics (Total, Today, Month)
 */
export async function getUsageStats(): Promise<UsageStats> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // We'll fetch all logs for calculation (for a large app, you'd want database aggregation)
    // For this scale, fetching recent logs or using a summary table is fine. 
    // Let's use a simple query for now.

    const { data: rawData, error } = await supabase
        .from('ai_usage_logs' as any)
        .select('cost, input_tokens, output_tokens, created_at');

    if (error || !rawData) {
        console.error('Failed to fetch usage stats:', error);
        return {
            totalCost: 0,
            todayCost: 0,
            monthCost: 0,
            totalTokens: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0
        };
    }

    const data = rawData as any[];

    let totalCost = 0;
    let todayCost = 0;
    let monthCost = 0;
    let totalTokens = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    data.forEach(log => {
        const cost = Number(log.cost);
        const input = log.input_tokens || 0;
        const output = log.output_tokens || 0;
        const tokens = input + output;

        totalCost += cost;
        totalTokens += tokens;
        totalInputTokens += input;
        totalOutputTokens += output;

        if (log.created_at >= startOfDay) {
            todayCost += cost;
        }
        if (log.created_at >= startOfMonth) {
            monthCost += cost;
        }
    });

    return { totalCost, todayCost, monthCost, totalTokens, totalInputTokens, totalOutputTokens };
}

/**
 * Fetch paginated usage logs
 */
export async function getUsageLogs(limit: number = 50, offset: number = 0): Promise<UsageLog[]> {
    const { data, error } = await supabase
        .from('ai_usage_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Failed to fetch usage logs:', error);
        return [];
    }

    return data as any as UsageLog[];
}
