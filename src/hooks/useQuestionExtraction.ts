import { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractChunkImages, ensureStorageBucket } from '@/services/pdfImageService';
import { logAiUsage } from '@/services/aiUsageService';

// --- Types ---
export interface ExtractedQuestion {
    question_text: string;
    options: string[]; // Changed from {A,B,C,D} to array to support 2-5 options
    correct_answer: string;
    topic: string;
    subtopic: string;
    difficulty: string;
    explanation: string;
    has_image: boolean;
    image_description?: string;
}

export interface ExtractionProgress {
    step: 'idle' | 'preparing' | 'uploading' | 'processing' | 'extracting' | 'saving' | 'complete' | 'error';
    detail: string;
    currentChunk?: number;
    totalChunks?: number;
    tokens?: { total: number; prompt: number; completion: number };
    questionsExtracted?: number;
}

export interface ExtractionConfig {
    pagesPerChunk: number;
    startPage?: number;
    endPage?: number;
    parallelChunks: number;
}

interface PdfChunk {
    blob: Blob;
    startPage: number;
    endPage: number;
    index: number;
    pageImages: Map<number, string>; // page number -> base64 image
}

const DEFAULT_CONFIG: ExtractionConfig = {
    pagesPerChunk: 3, // Reduced from 5 to ensure exhaustive extraction
    parallelChunks: 1, // Sequential by default for cost efficiency
};



// --- Hook ---
export function useQuestionExtraction() {
    const [progress, setProgress] = useState<ExtractionProgress>({ step: 'idle', detail: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const abortRef = useRef(false);

    const reset = useCallback(() => {
        setProgress({ step: 'idle', detail: '' });
        setIsProcessing(false);
        abortRef.current = false;
    }, []);

    const stop = useCallback(() => {
        abortRef.current = true;
        toast.info('Stopping extraction after current chunk...');
    }, []);

    // Split PDF into chunks with optional page range
    const splitPdfIntoChunks = async (
        file: File,
        config: ExtractionConfig
    ): Promise<PdfChunk[]> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();

        const startPage = Math.max(1, config.startPage || 1);
        const endPage = Math.min(totalPages, config.endPage || totalPages);

        const chunks: PdfChunk[] = [];

        for (let i = startPage - 1; i < endPage; i += config.pagesPerChunk) {
            const chunkEnd = Math.min(i + config.pagesPerChunk, endPage);
            const newPdf = await PDFDocument.create();
            const pageIndices = Array.from({ length: chunkEnd - i }, (_, k) => i + k);

            const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            chunks.push({
                blob,
                startPage: i + 1,
                endPage: chunkEnd,
                index: chunks.length,
                pageImages: new Map(), // Will be populated if images are detected
            });
        }

        return chunks;
    };

    // Upload file to Gemini API
    const uploadToGemini = async (blob: Blob, displayName: string, apiKey: string): Promise<string> => {
        // Get upload URL
        const uploadUrlResponse = await fetch(
            `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': blob.size.toString(),
                    'X-Goog-Upload-Header-Content-Type': 'application/pdf',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file: { display_name: displayName } })
            }
        );

        if (!uploadUrlResponse.ok) throw new Error('Failed to get upload URL');
        const uploadUrl = uploadUrlResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) throw new Error('No upload URL returned');

        // Upload file
        const uploadFileResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': blob.size.toString(),
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize',
            },
            body: blob
        });

        if (!uploadFileResponse.ok) throw new Error('File upload failed');
        const fileInfo = await uploadFileResponse.json();
        const fileName = fileInfo.file.name;

        // Wait for processing
        let fileState = fileInfo.file.state;
        while (fileState === 'PROCESSING') {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const stateResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
            );
            const stateData = await stateResponse.json();
            fileState = stateData.state;
            if (fileState === 'FAILED') throw new Error('File processing failed');
        }

        return fileInfo.file.uri;
    };

    // Extract questions from a chunk
    const extractFromChunk = async (
        chunk: PdfChunk,
        apiKey: string,
        fileName: string,
        model: string
    ): Promise<{ questions: ExtractedQuestion[]; tokens: { total: number; prompt: number; completion: number } }> => {
        const fileUri = await uploadToGemini(chunk.blob, `${fileName}_chunk_${chunk.index}`, apiKey);
        const pageCount = chunk.endPage - chunk.startPage + 1;

        const prompt = `You are an expert educational content extractor.

CONTEXT:
- This PDF chunk contains ${pageCount} pages (Pages ${chunk.startPage} to ${chunk.endPage} of the original document).
- PDFs may contain BOTH questions AND answer explanations/solutions.

CRITICAL RULES:
1. EXTRACT EVERY SINGLE Multiple Choice Question (MCQ) found in ALL ${pageCount} PAGES of this chunk.
2. DO NOT STOP until you have processed ALL content on ALL ${pageCount} pages.
3. START EXTRACTING FROM THE VERY FIRST PAGE OF THIS CHUNK (Page ${chunk.startPage}). Do not skip the beginning.
4. SEPARATE questions from their answer explanations.
5. DO NOT extract pure answer keys or solution walkthroughs as questions.
6. A valid MCQ has: a question stem + labeled options (can be 2, 3, 4, or 5 options).

OPTION HANDLING:
- Questions may have 2, 3, 4, or 5 options (not always 4).
- Extract ALL options provided, in order.
- Options may be labeled A/B/C/D/E or 1/2/3/4/5 or other formats.
- Store options as an array of strings.

HOW TO HANDLE MIXED CONTENT:
- If you see "1. Question... Ans: A. Explanation...", EXTRACT the question and options.
- Put the "Explanation" part into the "explanation" field.
- DO NOT create a separate question for the explanation.

WHAT TO IGNORE (Invalid Questions):
- "Ans: volatile" (Just an answer)
- "Solution: The correct answer is B because..." (Just a solution)
- Bullet points explaining terms (e.g., "• Volatile: This means...")

FOR EACH VALID MCQ:
1. Extract the question text (remove leading numbers).
2. Extract all options as an array (2-5 options).
3. Determine the correct answer index (0-based: 0 for first option, 1 for second, etc.).
4. **ALWAYS write a clear, detailed explanation** - this is MANDATORY for every question.
5. Set has_image: true if needed.

OUTPUT (JSON array only):
[{
  "question_text": "The actual question text without numbering",
  "options": ["First option text", "Second option text", "Third option text", "Fourth option text"],
  "correct_answer": "2",
  "topic": "",
  "subtopic": "",
  "explanation": "REQUIRED: Detailed explanation of why this answer is correct. Include reasoning, key concepts, and why other options are incorrect.",
  "difficulty": "easy|medium|hard",
  "has_image": false,
  "image_description": ""
}]

IMPORTANT: 
- "options" is an ARRAY of strings (not an object)
- "correct_answer" is the INDEX (0, 1, 2, 3, or 4) as a STRING
- "explanation" is MANDATORY and must be detailed (minimum 20 words)
- Include ALL options found (2-5 options)`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [
                            { file_data: { mime_type: 'application/pdf', file_uri: fileUri } },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.1,
                        maxOutputTokens: 16000
                    }
                })
            }
        );

        if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);
        const data = await response.json();

        const tokens = {
            total: data.usageMetadata?.totalTokenCount || 0,
            prompt: data.usageMetadata?.promptTokenCount || 0,
            completion: data.usageMetadata?.candidatesTokenCount || 0,
        };

        // Log usage
        await logAiUsage(
            model,
            tokens.prompt,
            tokens.completion,
            'question_extraction',
            { fileName, chunkIndex: chunk.index }
        );

        // Parse response
        let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return { questions: [], tokens };

        rawText = rawText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

        let questions: ExtractedQuestion[] = [];
        try {
            questions = JSON.parse(rawText);
            if (!Array.isArray(questions) && rawText.trim().startsWith('[')) {
                questions = JSON.parse(rawText.trim().replace(/,?\s*$/, '') + ']');
            }
        } catch {
            // Recovery attempt
            if (rawText.trim().startsWith('[')) {
                try {
                    questions = JSON.parse(rawText.trim().replace(/,?\s*$/, '') + ']');
                } catch { }
            }
        }

        return { questions: Array.isArray(questions) ? questions : [], tokens };
    };

    // Main extraction function
    const extract = useCallback(async (
        file: File,
        config: Partial<ExtractionConfig> = {},
        model: string = 'gemini-1.5-flash',
        onQuestionsExtracted?: () => void  // Callback for real-time UI updates
    ): Promise<number> => {
        const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!geminiKey) {
            toast.error('Gemini API key not configured');
            return 0;
        }

        const finalConfig = { ...DEFAULT_CONFIG, ...config };
        setIsProcessing(true);
        abortRef.current = false;

        let totalQuestions = 0;
        let totalTokens = { total: 0, prompt: 0, completion: 0 };

        try {
            // Split PDF
            setProgress({ step: 'preparing', detail: 'Splitting PDF into chunks...' });
            const chunks = await splitPdfIntoChunks(file, finalConfig);

            // Process chunks
            for (let i = 0; i < chunks.length; i++) {
                if (abortRef.current) {
                    toast.info('Extraction stopped by user');
                    break;
                }

                const chunk = chunks[i];
                setProgress({
                    step: 'extracting',
                    detail: `Processing pages ${chunk.startPage}-${chunk.endPage}...`,
                    currentChunk: i + 1,
                    totalChunks: chunks.length,
                    tokens: totalTokens,
                    questionsExtracted: totalQuestions,
                });

                try {
                    const { questions, tokens } = await extractFromChunk(chunk, geminiKey, file.name, model);

                    totalTokens.total += tokens.total;
                    totalTokens.prompt += tokens.prompt;
                    totalTokens.completion += tokens.completion;

                    if (questions.length > 0) {
                        // Extract images if any questions have images
                        const questionsWithImages = questions.filter(q => q.has_image);
                        let chunkImageUrls = new Map<number, string>();

                        if (questionsWithImages.length > 0) {
                            setProgress({
                                step: 'uploading',
                                detail: `Extracting ${questionsWithImages.length} images...`,
                                currentChunk: i + 1,
                                totalChunks: chunks.length,
                                tokens: totalTokens,
                                questionsExtracted: totalQuestions,
                            });

                            try {
                                // Ensure storage bucket exists
                                await ensureStorageBucket();

                                // Extract all pages in this chunk as images
                                chunkImageUrls = await extractChunkImages(
                                    chunk.blob,
                                    chunk.startPage,
                                    chunk.endPage,
                                    `question_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`
                                );
                            } catch (imgErr) {
                                console.warn('Image extraction failed:', imgErr);
                            }
                        }

                        // Save to database
                        setProgress({
                            step: 'saving',
                            detail: `Saving ${questions.length} questions...`,
                            currentChunk: i + 1,
                            totalChunks: chunks.length,
                            tokens: totalTokens,
                            questionsExtracted: totalQuestions,
                        });

                        // For questions with images, assign the first available image URL
                        // (Since we can't know exact page mapping, we use the chunk's image)
                        const chunkImageUrl = chunkImageUrls.size > 0
                            ? Array.from(chunkImageUrls.values())[0]
                            : null;

                        const questionsToInsert = questions.map(q => ({
                            question_text: q.question_text,
                            options: Array.isArray(q.options)
                                ? q.options
                                : [(q.options as any)?.A || '', (q.options as any)?.B || '', (q.options as any)?.C || '', (q.options as any)?.D || ''].filter(Boolean),
                            correct_answer: q.correct_answer,
                            topic: q.topic,
                            subtopic: q.subtopic,
                            difficulty: q.difficulty?.toLowerCase() || 'medium',
                            explanation: q.explanation,
                            has_image: q.has_image || false,
                            image_description: q.image_description || null,
                            image_url: q.has_image ? chunkImageUrl : null,
                            is_verified: false,
                        }));

                        const { error } = await supabase.from('questions').insert(questionsToInsert);
                        if (!error) {
                            totalQuestions += questions.length;
                            // Notify UI to refresh immediately after each chunk
                            onQuestionsExtracted?.();
                        } else {
                            console.error('Insert error:', error);
                        }
                    }
                } catch (chunkError: any) {
                    console.warn(`Chunk ${i + 1} failed:`, chunkError);
                    toast.error(`Chunk ${i + 1} failed: ${chunkError.message}`);
                }
            }

            setProgress({
                step: 'complete',
                detail: `Extracted ${totalQuestions} questions!`,
                tokens: totalTokens,
                questionsExtracted: totalQuestions,
            });

            toast.success(`Extracted ${totalQuestions} questions! Tokens: ${totalTokens.total.toLocaleString()}`);
            return totalQuestions;

        } catch (error: any) {
            console.error('Extraction error:', error);
            setProgress({ step: 'error', detail: error.message });
            toast.error(`Extraction failed: ${error.message}`);
            return 0;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    return {
        extract,
        stop,
        reset,
        progress,
        isProcessing,
    };
}
