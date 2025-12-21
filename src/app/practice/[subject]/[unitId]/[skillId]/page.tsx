"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, HelpCircle, BookOpen, PlayCircle, Loader2, Clock, FileText, Flag, AlertTriangle, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVelocityPoints } from "@/hooks/useVelocityPoints";
import { RenderText } from "@/components/RenderText";
import { MarkdownText } from "@/components/MarkdownText";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


interface QuestionOption {
    id: string;
    text: string;
}

interface Question {
    id: string; // UUID from Supabase
    text: string;
    options: QuestionOption[];
    correctAnswer: string; // "A", "B", etc.
    explanation: string;
    puzzle_id?: string;
    difficulty?: string;
    statements?: string[];
    imageUrl?: string;
}

const DATA_SUFFICIENCY_OPTIONS = [
    { id: "A", text: "Statement (1) ALONE is sufficient, but statement (2) alone is not sufficient." },
    { id: "B", text: "Statement (2) ALONE is sufficient, but statement (1) alone is not sufficient." },
    { id: "C", text: "BOTH statements TOGETHER are sufficient, but NEITHER statement ALONE is sufficient." },
    { id: "D", text: "EACH statement ALONE is sufficient." },
    { id: "E", text: "Statements (1) and (2) TOGETHER are NOT sufficient." }
];

interface QuestionResult {
    questionId: string;
    isCorrect: boolean;
    timeTaken: number;
    userAnswer: string;
    correctAnswer: string;
}

const PracticeSession = () => {
    const params = useParams();
    const subject = params.subject as string;
    const unitId = params.unitId as string;
    const skillId = params.skillId as string;

    const router = useRouter();
    const { user } = useAuth();
    const { awardVP } = useVelocityPoints();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState("");
    const [isChecked, setIsChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [streak, setStreak] = useState(0);
    const [puzzleBody, setPuzzleBody] = useState<string | null>(null);

    // Time tracking
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [elapsedTime, setElapsedTime] = useState(0);
    const [questionTimeTaken, setQuestionTimeTaken] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Report Dialog State
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [reportDetails, setReportDetails] = useState("");
    const [submittingReport, setSubmittingReport] = useState(false);

    // Continuous Practice State
    const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
    const [fetchingMore, setFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // AI Explanation State
    const [aiExplanationOpen, setAiExplanationOpen] = useState(false);
    const [aiExplanation, setAiExplanation] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

    // VP Popup Animation State
    const [showVpPopup, setShowVpPopup] = useState(false);
    const [vpPopupAmount, setVpPopupAmount] = useState(0);

    const handleExplainWithAI = async () => {
        setAiExplanationOpen(true);
        if (aiExplanation && aiExplanation !== "Loading...") return; // Don't re-fetch if already have it for this session? 
        // Actually, we should reset it per question. 
        // For now, let's fetch every time button is clicked if empty.

        setAiLoading(true);
        try {
            // Construct URL manually to debug connection issues
            // @ts-ignore
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            // @ts-ignore
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

            const functionUrl = `${supabaseUrl}/functions/v1/explain-question`;
            console.log("Attempting to fetch AI explanation from:", functionUrl);

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                    questionText: currentQuestion.text,
                    options: currentQuestion.options,
                    correctAnswer: currentQuestion.correctAnswer,
                    userAnswer: selectedOption
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP Error ${response.status}: ${response.statusText}`);
            }

            setAiExplanation(data.explanation);
        } catch (error: any) {
            console.error("Error fetching AI explanation:", error);
            const errorMessage = error.message || "Unknown error occurred";
            setAiExplanation(`Error: ${errorMessage}. \n\nCheck console for details.`);
            toast.error(`AI Error: ${errorMessage}`);
        } finally {
            setAiLoading(false);
        }
    };

    // Reset AI explanation on question change
    useEffect(() => {
        setAiExplanation("");
    }, [currentQuestionIndex]);

    // Timer Logic
    useEffect(() => {
        if (!isChecked && !loading && questions.length > 0) {
            setStartTime(Date.now());
            setElapsedTime(0);
            timerRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentQuestionIndex, isChecked, loading, questions.length]);

    // Update elapsed time display while running
    useEffect(() => {
        if (!isChecked && !loading && questions.length > 0) {
            const interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [startTime, isChecked, loading, questions.length]);


    // Initial Fetch
    useEffect(() => {
        const initSession = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // 1. Fetch answered IDs
                const { data: progressData, error: progressError } = await supabase
                    .from('user_progress' as any)
                    .select('question_id')
                    .eq('user_id', user.id);

                if (progressError) throw progressError;

                const ids = new Set((progressData as any)?.map((p: any) => p.question_id) || []);
                setAnsweredIds(ids);

                // 2. Fetch first batch of questions
                await fetchQuestionsBatch(ids);

            } catch (error) {
                console.error("Error initializing session:", error);
                toast.error("Failed to start session");
            } finally {
                setLoading(false);
            }
        };

        if (skillId) {
            initSession();
        }
    }, [skillId, user]);

    const fetchQuestionsBatch = async (excludeIds: Set<string>, isLoadMore = false) => {
        if (!skillId) return;

        try {
            if (isLoadMore) setFetchingMore(true);

            const decodedSubtopic = decodeURIComponent(skillId);
            let query = supabase.from('questions').select('*');

            // Apply Filters (Same as before)
            const difficultyMap: Record<string, string> = {
                'Basic': 'Easy',
                'Intermediate': 'Medium',
                'Advanced': 'Hard'
            };

            if (subject?.toLowerCase() === 'analytical') {
                if (unitId === '3') {
                    query = query.eq('subtopic', 'Data Sufficiency');
                    if (decodedSubtopic !== "Mistakes Review") query = query.eq('difficulty', difficultyMap[decodedSubtopic]);
                } else if (unitId === '4') {
                    query = query.eq('subtopic', 'Critical Reasoning');
                    if (decodedSubtopic !== "Mistakes Review") query = query.eq('difficulty', difficultyMap[decodedSubtopic]);
                } else if (decodedSubtopic !== "Mistakes Review") {
                    query = query.eq('subtopic', decodedSubtopic);
                }
            } else {
                const decodedUnit = decodeURIComponent(unitId || "");
                if (decodedUnit) query = query.eq('subtopic', decodedUnit);
                if (decodedSubtopic !== "Mistakes Review") query = query.eq('difficulty', difficultyMap[decodedSubtopic]);
            }

            // Exclude answered questions
            // Note: .not('id', 'in', ...) can fail if list is too long. 
            // For now, we fetch a bit more and filter client side if the list is huge, 
            // or rely on Supabase handling it. 
            // Optimization: If excludeIds is huge, we might need a different strategy (RPC).
            // For this clone, we'll pass the array.
            if (excludeIds.size > 0) {
                // Convert Set to Array
                const idsArray = Array.from(excludeIds);
                // Supabase URL limit might be hit if thousands of IDs. 
                // Let's cap it or assume it's fine for now.
                query = query.not('id', 'in', `(${idsArray.join(',')})`);
            }

            const { data, error } = await query.limit(10); // Fetch 10 at a time

            if (error) throw error;

            if (data && data.length > 0) {
                const mappedQuestions = mapQuestions(data, unitId);

                if (isLoadMore) {
                    setQuestions(prev => [...prev, ...mappedQuestions]);
                } else {
                    setQuestions(mappedQuestions);
                }
            } else {
                setHasMore(false);
                if (!isLoadMore && questions.length === 0) {
                    // No questions at all (or all answered)
                }
            }

        } catch (error) {
            console.error("Error fetching batch:", error);
        } finally {
            setFetchingMore(false);
        }
    };

    const mapQuestions = (data: any[], unitId?: string): Question[] => {
        return data.map((q: any) => {
            let optionsList = q.options;
            if (!Array.isArray(optionsList) && typeof optionsList === 'object' && optionsList !== null) {
                // Convert dictionary to array
                optionsList = Object.entries(optionsList).map(([key, val]) => ({ id: key, text: val }));
            } else if (!Array.isArray(optionsList)) {
                optionsList = [];
            }

            const mappedOptions = optionsList.map((opt: any, index: number) => {
                if (typeof opt === 'string') {
                    return { id: String.fromCharCode(65 + index), text: opt };
                } else if (typeof opt === 'object' && opt !== null) {
                    return { id: opt.id || String.fromCharCode(65 + index), text: opt.text || JSON.stringify(opt) };
                }
                return { id: String.fromCharCode(65 + index), text: String(opt) };
            });

            let correctId = "A";
            if (q.correct_answer) {
                if (q.correct_answer.startsWith("Option ")) {
                    correctId = q.correct_answer.split(" ")[1];
                } else if (q.correct_answer.length === 1) {
                    correctId = q.correct_answer;
                } else {
                    const match = mappedOptions.find((o: any) => o.text === q.correct_answer);
                    if (match) correctId = match.id;
                }
            }

            let finalOptions = mappedOptions;
            let statements: string[] = [];

            // Data Sufficiency Logic
            if (unitId === '3') {
                if (finalOptions.length === 2) {
                    statements = finalOptions.map((o: any) => o.text);
                } else {
                    const text = q.question_text;
                    const match = text.match(/(.*?)(?:1\.|Statement 1)(.*?)(?:2\.|Statement 2)(.*)/s);
                    if (match) {
                        q.question_text = match[1].trim();
                        statements = [match[2].trim(), match[3].trim()];
                    }
                }

                if (statements.length > 0) {
                    finalOptions = DATA_SUFFICIENCY_OPTIONS;
                } else if (finalOptions.length !== 5) {
                    finalOptions = DATA_SUFFICIENCY_OPTIONS;
                }
            }

            return {
                id: q.id,
                text: q.question_text,
                options: finalOptions,
                correctAnswer: correctId,
                explanation: q.explanation || "No explanation provided.",
                puzzle_id: q.puzzle_id,
                difficulty: q.difficulty,
                imageUrl: q.image_url,
                statements: statements.length > 0 ? statements : undefined
            };
        });
    };

    const currentQuestion = questions[currentQuestionIndex];
    // Progress is now just "Questions Answered" count
    const questionsAnswered = answeredIds.size; // This includes previous sessions

    // Fetch puzzle body when current question changes
    useEffect(() => {
        const fetchPuzzle = async () => {
            if (currentQuestion?.puzzle_id) {
                try {
                    const { data } = await supabase
                        .from('puzzles' as any)
                        .select('body')
                        .eq('id', currentQuestion.puzzle_id)
                        .single();
                    if (data) setPuzzleBody((data as any).body);
                } catch (error) {
                    console.error("Error fetching puzzle:", error);
                }
            } else {
                setPuzzleBody(null);
            }
        };
        fetchPuzzle();
    }, [currentQuestion]);

    const handleCheck = async () => {
        if (!selectedOption) {
            toast.error("Please select an option");
            return;
        }

        if (timerRef.current) clearInterval(timerRef.current);
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        setQuestionTimeTaken(timeTaken);

        const correct = selectedOption === currentQuestion.correctAnswer;
        setIsCorrect(correct);
        setIsChecked(true);

        if (correct) {
            setStreak(prev => prev + 1);
            toast.success("Correct Answer!");

            // Award VP for correct answer
            await awardVP({
                amount: 5,
                reason: 'correct_answer',
                questionId: currentQuestion.id,
                metadata: { timeTaken, subject, unitId, skillId }
            });

            // Show VP popup
            setVpPopupAmount(5);
            setShowVpPopup(true);
            setTimeout(() => setShowVpPopup(false), 1000);
        } else {
            setStreak(0);
            toast.error("Incorrect. Try again!");

            // Deduct VP for incorrect answer
            await awardVP({
                amount: -2,
                reason: 'correct_answer', // Use same reason, just negative amount
                questionId: currentQuestion.id,
                metadata: { timeTaken, subject, unitId, skillId, incorrect: true }
            });

            // Show VP popup
            setVpPopupAmount(-2);
            setShowVpPopup(true);
            setTimeout(() => setShowVpPopup(false), 1000);
        }

        // Save to Supabase
        if (user) {
            try {
                const { error } = await supabase
                    .from('user_progress' as any)
                    .insert({
                        user_id: user.id,
                        question_id: currentQuestion.id,
                        is_correct: correct
                    });

                if (!error) {
                    // Update local answered set
                    setAnsweredIds(prev => new Set(prev).add(currentQuestion.id));
                }
            } catch (err) {
                console.error("Exception saving progress:", err);
            }
        }
    };

    const handleNext = () => {
        // Load more if we are near the end
        if (currentQuestionIndex >= questions.length - 2 && hasMore && !fetchingMore) {
            fetchQuestionsBatch(answeredIds, true);
        }

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedOption("");
            setIsChecked(false);
            setIsCorrect(false);
            setQuestionTimeTaken(null);
            setStartTime(Date.now());

            // Reset AI Explanation
            setAiExplanationOpen(false);
            setAiExplanation("");
        } else if (!hasMore) {
            toast.success("You've completed all available questions for this topic!");
            router.back();
        }
    };

    const handleReportSubmit = async () => {
        if (!reportReason) {
            toast.error("Please select a reason for reporting.");
            return;
        }

        setSubmittingReport(true);
        try {
            const { error } = await supabase
                .from('question_reports' as any)
                .insert({
                    question_id: currentQuestion.id,
                    user_id: user?.id || null,
                    report_reason: reportReason,
                    additional_details: reportDetails
                });

            if (error) throw error;

            toast.success("Report submitted successfully. Thank you for your feedback!");
            setReportOpen(false);
            setReportReason("");
            setReportDetails("");
        } catch (error) {
            console.error("Error submitting report:", error);
            toast.error("Failed to submit report. Please try again.");
        } finally {
            setSubmittingReport(false);
        }
    };

    const handleStartOver = async () => {
        if (!confirm("This will reset your progress for this topic and allow you to practice these questions again. Are you sure?")) return;

        setLoading(true);
        try {
            // 1. Fetch all question IDs for this topic
            const decodedSubtopic = decodeURIComponent(skillId || "");
            let query = supabase.from('questions').select('id');

            // Apply Filters (Same as fetchQuestionsBatch)
            const difficultyMap: Record<string, string> = {
                'Basic': 'Easy',
                'Intermediate': 'Medium',
                'Advanced': 'Hard'
            };

            if (subject?.toLowerCase() === 'analytical') {
                if (unitId === '3') {
                    query = query.eq('subtopic', 'Data Sufficiency');
                    if (decodedSubtopic !== "Mistakes Review") query = query.eq('difficulty', difficultyMap[decodedSubtopic]);
                } else if (unitId === '4') {
                    query = query.eq('subtopic', 'Critical Reasoning');
                    if (decodedSubtopic !== "Mistakes Review") query = query.eq('difficulty', difficultyMap[decodedSubtopic]);
                } else if (decodedSubtopic !== "Mistakes Review") {
                    query = query.eq('subtopic', decodedSubtopic);
                }
            } else {
                const decodedUnit = decodeURIComponent(unitId || "");
                if (decodedUnit) query = query.eq('subtopic', decodedUnit);
                if (decodedSubtopic !== "Mistakes Review") query = query.eq('difficulty', difficultyMap[decodedSubtopic]);
            }

            const { data: topicQuestions, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            const topicQuestionIds = topicQuestions?.map(q => q.id) || [];

            if (topicQuestionIds.length > 0) {
                // 2. Delete progress for these questions
                const { error: deleteError } = await supabase
                    .from('user_progress' as any)
                    .delete()
                    .eq('user_id', user?.id)
                    .in('question_id', topicQuestionIds);

                if (deleteError) throw deleteError;
            }

            toast.success("Progress reset! Starting over...");
            window.location.reload();

        } catch (error) {
            console.error("Error resetting progress:", error);
            toast.error("Failed to reset progress");
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading your session...</p>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md mx-auto p-6">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">All Caught Up!</h2>
                    <p className="text-muted-foreground">
                        You've practiced all available questions for this topic. Great job!
                    </p>
                    <div className="flex flex-col gap-3 pt-4">
                        <Button onClick={() => router.back()} variant="outline" className="w-full">
                            Return to Topics
                        </Button>
                        <Button onClick={handleStartOver} className="w-full">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Start Over
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentQuestion) return null; // Should not happen if questions.length > 0

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Bar */}
            <div className="border-b border-border/40 bg-background/95 backdrop-blur-xl p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <XCircle className="w-6 h-6 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold capitalize">{subject} Practice</h1>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Unit {unitId}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span>{decodeURIComponent(skillId || "")}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* Timer Display */}
                        <div className="flex items-center gap-2 font-mono text-sm bg-muted/50 px-3 py-1 rounded-md">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className={cn(
                                isChecked ? "text-muted-foreground" : "text-foreground",
                                elapsedTime > 120 && !isChecked ? "text-red-500" : ""
                            )}>
                                {isChecked && questionTimeTaken !== null ? (
                                    <span>Time: {questionTimeTaken}s</span>
                                ) : (
                                    <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
                                )}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full text-sm font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            {streak} Streak
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
                {/* Left Sidebar - Context or Puzzle */}
                <div className="w-80 border-r border-border/40 bg-card/30 hidden lg:flex flex-col p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {puzzleBody ? (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Puzzle Scenario
                                    </h3>
                                    {currentQuestion.difficulty && (
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider",
                                            currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Basic' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                currentQuestion.difficulty === 'Medium' || currentQuestion.difficulty === 'Intermediate' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                    "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}>
                                            {currentQuestion.difficulty}
                                        </span>
                                    )}
                                </div>
                                <Card className="border-primary/50 bg-primary/5">
                                    <CardContent className="p-4">
                                        <div className="text-sm leading-relaxed whitespace-pre-line">
                                            <RenderText text={puzzleBody} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                        Current Lesson
                                    </h3>
                                    <Card className="border-primary/50 bg-primary/5">
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <PlayCircle className="w-5 h-5 text-primary mt-0.5" />
                                            <div>
                                                <p className="font-medium text-sm text-primary">Practice: {decodeURIComponent(skillId || "")}</p>
                                                <p className="text-xs text-muted-foreground mt-1">Estimated time: {questions.length * 2} mins</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                        Up Next
                                    </h3>
                                    <div className="space-y-3 opacity-60">
                                        <div className="flex items-center gap-3 p-2">
                                            <BookOpen className="w-4 h-4" />
                                            <span className="text-sm">Review: Key Concepts</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-2">
                                            <HelpCircle className="w-4 h-4" />
                                            <span className="text-sm">Quiz: Unit {unitId} Checkup</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Main Content - Question */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 lg:p-12">
                        <div className="max-w-3xl mx-auto w-full space-y-8">
                            {/* Mobile Puzzle View */}
                            {puzzleBody && (
                                <div className="lg:hidden mb-6">
                                    <Card className="border-primary/50 bg-primary/5">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    Puzzle Scenario
                                                </h3>
                                            </div>
                                            <div className="text-sm leading-relaxed whitespace-pre-line">
                                                <RenderText text={puzzleBody} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Question Text */}
                            <div className="prose dark:prose-invert max-w-none mb-8">
                                {(() => {
                                    const text = currentQuestion.text;
                                    // Try (1) and (2) first
                                    let s1Index = text.indexOf('(1)');
                                    let s2Index = text.indexOf('(2)');
                                    let offset = 3; // Length of "(1)"

                                    // If not found, try 1. and 2.
                                    if (s1Index === -1 || s2Index === -1) {
                                        s1Index = text.indexOf('1.');
                                        s2Index = text.indexOf('2.');
                                        offset = 2; // Length of "1."
                                    }

                                    if (s1Index !== -1 && s2Index !== -1 && s2Index > s1Index) {
                                        const mainQuestion = text.substring(0, s1Index).trim();
                                        const statement1 = text.substring(s1Index + offset, s2Index).trim();
                                        const statement2 = text.substring(s2Index + offset).trim();

                                        return (
                                            <div className="space-y-4">
                                                <div className="text-lg">
                                                    <RenderText text={mainQuestion} />
                                                </div>
                                                <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-primary">(1)</span>
                                                        <div><RenderText text={statement1} /></div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-primary">(2)</span>
                                                        <div><RenderText text={statement2} /></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return <div className="text-lg"><RenderText text={text} /></div>;
                                    }
                                })()}
                            </div>

                            {/* Options */}
                            <div className="space-y-6">
                                <RadioGroup value={selectedOption} onValueChange={setSelectedOption} className="space-y-3">
                                    {currentQuestion.options.map((option, idx) => (
                                        <div key={idx} className={cn(
                                            "flex items-center space-x-3 p-4 rounded-xl border transition-all duration-200 hover:bg-accent/50 cursor-pointer",
                                            selectedOption === option.id ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 bg-card/50",
                                            isChecked && option.id === currentQuestion.correctAnswer ? "border-green-500 bg-green-500/10" : "",
                                            isChecked && selectedOption === option.id && selectedOption !== currentQuestion.correctAnswer ? "border-red-500 bg-red-500/10" : ""
                                        )}>
                                            <RadioGroupItem value={option.id} id={option.id} className="sr-only" />
                                            <Label htmlFor={option.id} className="flex-1 cursor-pointer flex items-center gap-4">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transition-colors",
                                                    selectedOption === option.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border",
                                                    isChecked && option.id === currentQuestion.correctAnswer ? "bg-green-500 text-white border-green-500" : "",
                                                    isChecked && selectedOption === option.id && selectedOption !== currentQuestion.correctAnswer ? "bg-red-500 text-white border-red-500" : ""
                                                )}>
                                                    {option.id}
                                                </div>
                                                <div className="text-base">
                                                    <RenderText text={option.text} />
                                                </div>
                                            </Label>
                                            {isChecked && option.id === currentQuestion.correctAnswer && (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            )}
                                            {isChecked && selectedOption === option.id && selectedOption !== currentQuestion.correctAnswer && (
                                                <XCircle className="w-5 h-5 text-red-500" />
                                            )}
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>

                            {/* Explanation & Next Button */}
                            {isChecked && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className={cn(
                                        "p-6 rounded-xl border",
                                        isCorrect ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                                    )}>
                                        <h3 className={cn(
                                            "font-bold mb-2 flex items-center gap-2",
                                            isCorrect ? "text-green-600" : "text-red-600"
                                        )}>
                                            {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                            {isCorrect ? "Correct!" : "Incorrect"}
                                        </h3>
                                        <div className="prose dark:prose-invert max-w-none text-sm">
                                            <p className="font-semibold mb-1">Explanation:</p>
                                            <MarkdownText content={currentQuestion.explanation} />
                                        </div>
                                    </div>

                                    {/* AI Explain Button */}
                                    <div className="flex gap-4">
                                        <Dialog open={aiExplanationOpen} onOpenChange={setAiExplanationOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full gap-2 border-primary/20 hover:bg-primary/5"
                                                    onClick={handleExplainWithAI}
                                                >
                                                    <SparklesIcon className="w-4 h-4 text-purple-500" />
                                                    Explain with AI
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle className="flex items-center gap-2">
                                                        <SparklesIcon className="w-5 h-5 text-purple-500" />
                                                        AI Explanation
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Detailed breakdown of the solution.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="mt-4">
                                                    {aiLoading ? (
                                                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                                                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                                            <p className="text-sm text-muted-foreground">Analyzing question...</p>
                                                        </div>
                                                    ) : (
                                                        <div className="prose dark:prose-invert max-w-none text-sm">
                                                            <MarkdownText content={aiExplanation} />
                                                        </div>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Report Button */}
                                        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-destructive">
                                                    <Flag className="w-4 h-4" />
                                                    Report Issue
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Report Question Issue</DialogTitle>
                                                    <DialogDescription>
                                                        Help us improve! What's wrong with this question?
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <Select value={reportReason} onValueChange={setReportReason}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a reason" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="wrong_answer">Wrong Answer Key</SelectItem>
                                                            <SelectItem value="typo">Typo / Grammar Issue</SelectItem>
                                                            <SelectItem value="confusing">Confusing / Unclear</SelectItem>
                                                            <SelectItem value="rendering">Rendering Issue</SelectItem>
                                                            <SelectItem value="other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Textarea
                                                        placeholder="Additional details (optional)..."
                                                        value={reportDetails}
                                                        onChange={(e) => setReportDetails(e.target.value)}
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
                                                    <Button onClick={handleReportSubmit} disabled={submittingReport || !reportReason}>
                                                        {submittingReport ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                        Submit Report
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-border/40 bg-background/95 backdrop-blur p-4">
                        <div className="max-w-3xl mx-auto flex items-center justify-between">
                            <div className="text-sm text-muted-foreground hidden sm:block">
                                Question {currentQuestionIndex + 1} of {questions.length}
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                {!isChecked ? (
                                    <Button onClick={handleCheck} className="w-full sm:w-auto gradient-primary px-8" size="lg">
                                        Check Answer
                                    </Button>
                                ) : (
                                    <Button onClick={handleNext} className="w-full sm:w-auto px-8" size="lg">
                                        {currentQuestionIndex < questions.length - 1 ? (
                                            <>
                                                Next Question <ChevronRight className="w-4 h-4 ml-2" />
                                            </>
                                        ) : (
                                            <>
                                                Finish Practice <CheckCircle2 className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* VP Popup Animation */}
            {showVpPopup && (
                <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-[100]">
                    <div className="animate-in zoom-in fade-in duration-300 flex flex-col items-center">
                        <div className={cn(
                            "text-6xl font-black drop-shadow-lg flex items-center gap-2",
                            vpPopupAmount > 0 ? "text-yellow-400" : "text-red-500"
                        )}>
                            {vpPopupAmount > 0 ? "+" : ""}{vpPopupAmount} <Zap className="w-12 h-12 fill-current" />
                        </div>
                        <div className="text-white font-bold text-xl mt-2 drop-shadow-md">
                            Velocity Points
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function SparklesIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M9 3v4" />
            <path d="M3 5h4" />
            <path d="M3 9h4" />
        </svg>
    )
}

export default PracticeSession;
