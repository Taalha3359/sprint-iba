import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './use-debounce';

// --- Types ---
export interface Question {
    local_id: string;
    question_text: string;
    options: Record<string, string>; // Changed to support variable options (A, B, C, D, E, etc.)
    correct_answer: string;
    topic: string;
    subtopic: string;
    difficulty: string;
    explanation: string;
    is_verified: boolean;
    has_image?: boolean;
    image_url?: string;
    image_description?: string;
}

export interface FilterState {
    search: string;
    verificationStatus: 'all' | 'verified' | 'unverified';
    topic: string;
    difficulty: 'all' | 'easy' | 'medium' | 'hard';
    itemsPerPage: number;
}

const DEFAULT_FILTERS: FilterState = {
    search: '',
    verificationStatus: 'unverified',
    topic: '',
    difficulty: 'all',
    itemsPerPage: 10,
};

// --- Hook ---
export function useQuestionFilters(initialFilters: Partial<FilterState> = {}) {
    const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters });
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [availableTopics, setAvailableTopics] = useState<string[]>([]);

    const debouncedSearch = useDebounce(filters.search, 500);

    // Fetch available topics for filter dropdown
    const fetchTopics = useCallback(async () => {
        const { data } = await supabase
            .from('questions')
            .select('topic')
            .not('topic', 'is', null);

        if (data) {
            const uniqueTopics = [...new Set(data.map((q: any) => q.topic).filter(Boolean))];
            setAvailableTopics(uniqueTopics.sort());
        }
    }, []);

    // Main fetch function
    const fetchQuestions = useCallback(async (page = 1) => {
        setLoading(true);

        try {
            let query = supabase
                .from('questions')
                .select('*', { count: 'exact' });

            // Apply verification filter
            if (filters.verificationStatus === 'verified') {
                query = query.eq('is_verified', true);
            } else if (filters.verificationStatus === 'unverified') {
                query = query.eq('is_verified', false);
            }

            // Apply topic filter
            if (filters.topic) {
                query = query.eq('topic', filters.topic);
            }

            // Apply difficulty filter
            if (filters.difficulty !== 'all') {
                query = query.eq('difficulty', filters.difficulty);
            }

            // Apply search filter
            if (debouncedSearch) {
                query = query.ilike('question_text', `%${debouncedSearch}%`);
            }

            // Get count first
            const { count, error: countError } = await query;
            if (countError) throw countError;

            setTotalCount(count || 0);
            setTotalPages(Math.ceil((count || 0) / filters.itemsPerPage));

            // Fetch paginated data
            const from = (page - 1) * filters.itemsPerPage;
            const to = from + filters.itemsPerPage - 1;

            let dataQuery = supabase
                .from('questions')
                .select('*');

            // Reapply filters for data query
            if (filters.verificationStatus === 'verified') {
                dataQuery = dataQuery.eq('is_verified', true);
            } else if (filters.verificationStatus === 'unverified') {
                dataQuery = dataQuery.eq('is_verified', false);
            }

            if (filters.topic) {
                dataQuery = dataQuery.eq('topic', filters.topic);
            }

            if (filters.difficulty !== 'all') {
                dataQuery = dataQuery.eq('difficulty', filters.difficulty);
            }

            if (debouncedSearch) {
                dataQuery = dataQuery.ilike('question_text', `%${debouncedSearch}%`);
            }

            const { data, error } = await dataQuery
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const formattedQuestions: Question[] = (data || []).map((q: any) => {
                // Convert array options to labeled object
                const optionsObj: Record<string, string> = {};
                const labels = ['A', 'B', 'C', 'D', 'E'];
                if (Array.isArray(q.options)) {
                    q.options.forEach((opt: string, idx: number) => {
                        if (idx < labels.length) {
                            optionsObj[labels[idx]] = opt;
                        }
                    });
                } else if (typeof q.options === 'object') {
                    Object.assign(optionsObj, q.options);
                }

                // Convert numeric correct_answer to letter label
                let correctAnswer = q.correct_answer;
                if (correctAnswer && !isNaN(Number(correctAnswer))) {
                    const index = parseInt(correctAnswer);
                    correctAnswer = labels[index] || correctAnswer;
                }

                return {
                    local_id: q.id,
                    question_text: q.question_text,
                    options: optionsObj,
                    correct_answer: correctAnswer,
                    topic: q.topic || '',
                    subtopic: q.subtopic || '',
                    difficulty: q.difficulty || 'medium',
                    explanation: q.explanation || '',
                    is_verified: q.is_verified,
                    has_image: q.has_image || false,
                    image_url: q.image_url || null,
                    image_description: q.image_description || null,
                };
            });

            setQuestions(formattedQuestions);
            setCurrentPage(page);
        } catch (error: any) {
            console.error('Error fetching questions:', error);
        } finally {
            setLoading(false);
        }
    }, [filters.verificationStatus, filters.topic, filters.difficulty, filters.itemsPerPage, debouncedSearch]);

    // Refetch when filters change
    useEffect(() => {
        fetchQuestions(1);
    }, [fetchQuestions]);

    // Load topics on mount
    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    // Update a single filter
    const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to page 1 when filter changes
    }, []);

    // Reset all filters
    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
        setCurrentPage(1);
    }, []);

    // Go to specific page
    const goToPage = useCallback((page: number) => {
        if (page >= 1 && page <= totalPages) {
            fetchQuestions(page);
        }
    }, [fetchQuestions, totalPages]);

    // Update a question locally
    const updateQuestionLocally = useCallback((id: string, key: string, value: any) => {
        setQuestions(prev => prev.map(q =>
            q.local_id === id ? { ...q, [key]: value } : q
        ));
    }, []);

    // Remove a question locally
    const removeQuestionLocally = useCallback((id: string) => {
        setQuestions(prev => prev.filter(q => q.local_id !== id));
    }, []);

    return {
        // State
        questions,
        filters,
        loading,
        currentPage,
        totalPages,
        totalCount,
        availableTopics,

        // Actions
        updateFilter,
        resetFilters,
        goToPage,
        refetch: () => fetchQuestions(currentPage),
        updateQuestionLocally,
        removeQuestionLocally,
    };
}
