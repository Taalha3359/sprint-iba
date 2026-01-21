"use client";

import { useState } from 'react';
import {
    Upload, CheckCircle, AlertCircle,
    Loader2, Trash2, ChevronDown, BrainCircuit,
    Info, Tag, MessageSquareQuote, Layers, RefreshCw, Search, Filter, Image as ImageIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuestionExtraction, ExtractionConfig } from "@/hooks/useQuestionExtraction";
import { useQuestionFilters, Question } from "@/hooks/useQuestionFilters";
import { TokenUsageStats } from '@/components/admin/TokenUsageStats';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function QuestionExtractor() {
    // Extraction state
    const [file, setFile] = useState<File | null>(null);
    const [pagesPerChunk, setPagesPerChunk] = useState(3);
    const [startPage, setStartPage] = useState<number | undefined>(undefined);
    const [endPage, setEndPage] = useState<number | undefined>(undefined);
    const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-flash');

    const { extract, stop, progress, isProcessing } = useQuestionExtraction();
    const {
        questions,
        filters,
        loading,
        currentPage,
        totalPages,
        totalCount,
        availableTopics,
        updateFilter,
        resetFilters,
        goToPage,
        refetch,
        updateQuestionLocally,
        removeQuestionLocally,
    } = useQuestionFilters();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) setFile(selectedFile);
    };

    const handleExtract = async () => {
        if (!file) return;

        const config: Partial<ExtractionConfig> = {
            pagesPerChunk,
            startPage: startPage || undefined,
            endPage: endPage || undefined,
        };

        // Pass refetch as callback - UI will update after each chunk is saved
        await extract(file, config, selectedModel, refetch);
        setFile(null);
    };

    const handleVerify = async (q: Question) => {
        try {
            // Convert options object to array
            const optionsArray = Object.values(q.options).filter(Boolean);

            const { error } = await supabase
                .from('questions')
                .update({
                    question_text: q.question_text,
                    options: optionsArray,
                    correct_answer: q.correct_answer,
                    topic: q.topic,
                    subtopic: q.subtopic,
                    difficulty: q.difficulty.toLowerCase(),
                    explanation: q.explanation,
                    is_verified: true
                } as any)
                .eq('id', q.local_id);

            if (error) throw error;

            toast.success("Question verified!");
            removeQuestionLocally(q.local_id);
        } catch (error: any) {
            toast.error(`Verification failed: ${error.message}`);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            removeQuestionLocally(id);
            toast.success("Question deleted");
        } catch {
            toast.error("Failed to delete question");
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <BrainCircuit className="w-5 h-5 text-white" />
                        </div>
                        Question Extractor
                    </h1>
                    <p className="text-slate-500 mt-1">Extract MCQs from PDFs using AI</p>
                </div>
                <Button variant="outline" onClick={refetch} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Token Usage Stats */}
            <TokenUsageStats />

            {/* Upload Section */}
            {/* Upload Section */}
            <Card className="border-slate-200">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Settings */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-900">Extraction Settings</h3>

                            {/* File Upload */}
                            <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center transition-all cursor-pointer">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload className="w-8 h-8 mx-auto text-slate-300 group-hover:text-indigo-500 mb-2" />
                                <p className="text-sm font-bold text-slate-600 truncate">
                                    {file ? file.name : "Click or drag PDF"}
                                </p>
                            </div>

                            {file && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="model">AI Model</Label>
                                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select model" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</SelectItem>
                                                <SelectItem value="gemini-2.0-flash-lite-preview-02-05">Gemini 2.0 Flash Lite (Preview)</SelectItem>
                                                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended)</SelectItem>
                                                <SelectItem value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</SelectItem>
                                                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Best Quality)</SelectItem>
                                                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="chunkSize">Pages/Chunk</Label>
                                        <Input
                                            id="chunkSize"
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={pagesPerChunk}
                                            onChange={e => setPagesPerChunk(parseInt(e.target.value) || 5)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="startPage">Start Page</Label>
                                        <Input
                                            id="startPage"
                                            type="number"
                                            min={1}
                                            placeholder="1"
                                            value={startPage || ''}
                                            onChange={e => setStartPage(parseInt(e.target.value) || undefined)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endPage">End Page</Label>
                                        <Input
                                            id="endPage"
                                            type="number"
                                            min={1}
                                            placeholder="All"
                                            value={endPage || ''}
                                            onChange={e => setEndPage(parseInt(e.target.value) || undefined)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Extract Button */}
                            {isProcessing ? (
                                <div className="flex gap-2">
                                    <Button disabled className="flex-1">
                                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                        Processing...
                                    </Button>
                                    <Button variant="destructive" onClick={stop}>Stop</Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleExtract}
                                    disabled={!file}
                                    className="w-full bg-slate-900 hover:bg-slate-800"
                                >
                                    <BrainCircuit className="w-4 h-4 mr-2" />
                                    Start Extraction
                                </Button>
                            )}
                        </div>

                        {/* Right: Progress & Info */}
                        <div className="space-y-4">
                            {progress.step !== 'idle' && (
                                <div className={`rounded-xl p-4 border ${progress.step === 'error' ? 'bg-rose-50 border-rose-200' :
                                    progress.step === 'complete' ? 'bg-emerald-50 border-emerald-200' :
                                        'bg-blue-50 border-blue-200'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        {progress.step === 'complete' ? (
                                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        ) : progress.step === 'error' ? (
                                            <AlertCircle className="w-4 h-4 text-rose-600" />
                                        ) : (
                                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                        )}
                                        <span className="font-bold text-sm capitalize">{progress.step}</span>
                                    </div>
                                    <p className="text-xs text-slate-600">{progress.detail}</p>
                                    {progress.currentChunk && progress.totalChunks && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Chunk {progress.currentChunk}/{progress.totalChunks}
                                        </p>
                                    )}
                                    {progress.tokens && (
                                        <p className="text-xs font-mono text-slate-500 mt-2">
                                            Tokens: {progress.tokens.total.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-indigo-600" /> How it works
                                </h4>
                                <ul className="space-y-2 text-xs text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full bg-white border flex items-center justify-center text-[10px] font-bold">1</span>
                                        Upload PDF with MCQs
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full bg-white border flex items-center justify-center text-[10px] font-bold">2</span>
                                        AI extracts & solves questions
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full bg-white border flex items-center justify-center text-[10px] font-bold">3</span>
                                        Review, edit, and verify
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filters Section */}
            <Card className="border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search questions..."
                                    value={filters.search}
                                    onChange={e => updateFilter('search', e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Verification Status */}
                        <Select
                            value={filters.verificationStatus}
                            onValueChange={(v: any) => updateFilter('verificationStatus', v)}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="unverified">Unverified</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Topic Filter */}
                        <Select
                            value={filters.topic || 'all'}
                            onValueChange={v => updateFilter('topic', v === 'all' ? '' : v)}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Topic" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Topics</SelectItem>
                                {availableTopics.map(topic => (
                                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Difficulty Filter */}
                        <Select
                            value={filters.difficulty}
                            onValueChange={(v: any) => updateFilter('difficulty', v)}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Items per page */}
                        <Select
                            value={filters.itemsPerPage.toString()}
                            onValueChange={v => updateFilter('itemsPerPage', parseInt(v))}
                        >
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Reset */}
                        <Button variant="ghost" size="sm" onClick={resetFilters}>
                            <Filter className="w-4 h-4 mr-1" />
                            Reset
                        </Button>

                        {/* Count */}
                        <Badge variant="secondary" className="ml-auto">
                            {totalCount} questions
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Questions List */}
            < div className="space-y-3" >
                {
                    loading ? (
                        <div className="flex justify-center py-12" >
                            <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            No questions found
                        </div>
                    ) : (
                        questions.map((q, idx) => (
                            <QuestionCard
                                key={q.local_id}
                                q={q}
                                idx={(currentPage - 1) * filters.itemsPerPage + idx}
                                onDelete={handleDelete}
                                onUpdate={updateQuestionLocally}
                                onVerify={() => handleVerify(q)}
                            />
                        ))
                    )
                }

                {/* Pagination */}
                {
                    totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-slate-600">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages || loading}
                            >
                                Next
                            </Button>
                        </div>
                    )
                }
            </div >
        </div >
    );
}

// --- Question Card Component ---
function QuestionCard({
    q,
    idx,
    onDelete,
    onUpdate,
    onVerify
}: {
    q: Question;
    idx: number;
    onDelete: (id: string) => void;
    onUpdate: (id: string, key: string, value: any) => void;
    onVerify: () => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Card className={`transition-all ${open ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
            <div
                className="p-4 flex items-center gap-4 cursor-pointer select-none"
                onClick={() => setOpen(!open)}
            >
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 border shrink-0">
                    {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {q.question_text || "Empty Question"}
                    </h4>
                    <div className="flex gap-3 mt-1 items-center">
                        <Badge variant="secondary" className="text-[10px] font-bold text-indigo-600 bg-indigo-50">
                            {q.topic || 'No Topic'}
                        </Badge>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{q.difficulty}</span>
                        {q.has_image && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <ImageIcon className="w-3 h-3 text-amber-500" />
                            </>
                        )}
                        {q.is_verified && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                            </>
                        )}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>

            {open && (
                <CardContent className="pt-0 border-t border-slate-50 space-y-6">
                    {/* Image Display */}
                    {q.has_image && q.image_url && (
                        <div className="mt-4">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <ImageIcon className="w-3 h-3" /> Question Image
                            </Label>
                            <img
                                src={q.image_url}
                                alt="Question image"
                                className="max-w-full rounded-lg border border-slate-200"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                        <div className="lg:col-span-8">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquareQuote className="w-3 h-3" /> Question Text
                            </Label>
                            <Textarea
                                value={q.question_text}
                                onChange={e => onUpdate(q.local_id, 'question_text', e.target.value)}
                                className="mt-2 min-h-[100px]"
                            />
                        </div>

                        <div className="lg:col-span-4 space-y-4">
                            <div>
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Tag className="w-3 h-3" /> Topic
                                </Label>
                                <Input
                                    value={q.topic}
                                    onChange={e => onUpdate(q.local_id, 'topic', e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="w-3 h-3" /> Sub-topic
                                </Label>
                                <Input
                                    value={q.subtopic}
                                    onChange={e => onUpdate(q.local_id, 'subtopic', e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Options</Label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const keys = Object.keys(q.options);
                                        const labels = ['A', 'B', 'C', 'D', 'E'];
                                        const nextLabel = labels[keys.length];
                                        if (nextLabel && keys.length < 5) {
                                            onUpdate(q.local_id, 'options', { ...q.options, [nextLabel]: '' });
                                        }
                                    }}
                                    disabled={Object.keys(q.options).length >= 5}
                                    className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                                >
                                    + Add Option
                                </button>
                                <button
                                    onClick={() => {
                                        const keys = Object.keys(q.options);
                                        if (keys.length > 2) {
                                            const newOptions = { ...q.options };
                                            delete newOptions[keys[keys.length - 1]];
                                            onUpdate(q.local_id, 'options', newOptions);
                                        }
                                    }}
                                    disabled={Object.keys(q.options).length <= 2}
                                    className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                                >
                                    - Remove
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.keys(q.options).map(key => (
                                <div
                                    key={key}
                                    className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${q.correct_answer === key ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
                                        }`}
                                >
                                    <button
                                        onClick={() => onUpdate(q.local_id, 'correct_answer', key)}
                                        className={`w-7 h-7 rounded-lg text-xs font-bold border shrink-0 ${q.correct_answer === key
                                            ? 'bg-emerald-600 border-emerald-600 text-white'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-500'
                                            }`}
                                    >
                                        {key}
                                    </button>
                                    <Textarea
                                        className="w-full bg-transparent text-sm resize-none border-0 p-0 focus-visible:ring-0 min-h-[40px]"
                                        value={q.options[key]}
                                        onChange={e => onUpdate(q.local_id, 'options', { ...q.options, [key]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <BrainCircuit className="w-3 h-3" /> AI Explanation
                        </Label>
                        <Textarea
                            value={q.explanation || ''}
                            onChange={e => onUpdate(q.local_id, 'explanation', e.target.value)}
                            placeholder="AI reasoning goes here..."
                            className="min-h-[100px] text-sm"
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <div className="flex gap-2">
                            {['Easy', 'Medium', 'Hard'].map(lvl => (
                                <button
                                    key={lvl}
                                    onClick={() => onUpdate(q.local_id, 'difficulty', lvl)}
                                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${q.difficulty?.toLowerCase() === lvl.toLowerCase()
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    {lvl}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={onVerify}
                                className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs font-bold"
                            >
                                <CheckCircle className="w-3 h-3 mr-2" />
                                Verify & Add
                            </Button>
                            <button
                                onClick={() => onDelete(q.local_id)}
                                className="text-rose-500 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
