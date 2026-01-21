/**
 * PDF Image Extraction Service
 * 
 * Renders PDF pages to images and uploads to Supabase Storage.
 * Uses pdfjs-dist for browser-side PDF rendering.
 */

import { supabase } from '@/integrations/supabase/client';

// PDF.js worker URL (loaded from CDN)
const PDFJS_VERSION = '3.11.174';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

declare global {
    interface Window {
        pdfjsLib: any;
    }
}

let pdfjsLoaded = false;

/**
 * Load PDF.js library from CDN
 */
async function loadPdfJs(): Promise<void> {
    if (pdfjsLoaded && window.pdfjsLib) return;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${PDFJS_CDN}/pdf.min.js`;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
            pdfjsLoaded = true;
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Render a single PDF page to a PNG blob
 */
async function renderPageToImage(
    pdfDoc: any,
    pageNumber: number,
    scale: number = 2.0
): Promise<Blob> {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page
    await page.render({
        canvasContext: context,
        viewport: viewport,
    }).promise;

    // Convert to blob
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to convert canvas to blob'));
            },
            'image/png',
            0.9
        );
    });
}

/**
 * Upload image blob to Supabase Storage
 */
async function uploadToStorage(
    blob: Blob,
    fileName: string
): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: true,
        });

    if (error) {
        console.error('Storage upload error:', error);
        return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

export interface PageImage {
    pageNumber: number;
    imageUrl: string;
}

/**
 * Extract images from specific PDF pages
 * 
 * @param pdfArrayBuffer - The PDF file as ArrayBuffer
 * @param pageNumbers - Array of page numbers to render (1-indexed)
 * @param fileNamePrefix - Prefix for uploaded file names
 * @returns Map of page number to image URL
 */
export async function extractPdfPageImages(
    pdfArrayBuffer: ArrayBuffer,
    pageNumbers: number[],
    fileNamePrefix: string
): Promise<Map<number, string>> {
    await loadPdfJs();

    const pdfDoc = await window.pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
    const pageImages = new Map<number, string>();

    for (const pageNum of pageNumbers) {
        if (pageNum < 1 || pageNum > pdfDoc.numPages) continue;

        try {
            const blob = await renderPageToImage(pdfDoc, pageNum);
            const fileName = `${fileNamePrefix}_page_${pageNum}_${Date.now()}.png`;
            const imageUrl = await uploadToStorage(blob, fileName);

            if (imageUrl) {
                pageImages.set(pageNum, imageUrl);
            }
        } catch (err) {
            console.warn(`Failed to render page ${pageNum}:`, err);
        }
    }

    return pageImages;
}

/**
 * Extract all pages from a PDF chunk as images
 * Used when AI indicates questions have images
 */
export async function extractChunkImages(
    chunkBlob: Blob,
    startPage: number,
    endPage: number,
    fileNamePrefix: string
): Promise<Map<number, string>> {
    const arrayBuffer = await chunkBlob.arrayBuffer();
    const pageNumbers = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => i + 1 // 1-indexed within chunk
    );

    return extractPdfPageImages(arrayBuffer, pageNumbers, fileNamePrefix);
}

/**
 * Check if storage bucket exists and create if needed
 */
export async function ensureStorageBucket(): Promise<boolean> {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some((b: any) => b.name === 'question-images');

        if (!exists) {
            const { error } = await supabase.storage.createBucket('question-images', {
                public: true,
            });
            if (error) {
                console.error('Failed to create bucket:', error);
                return false;
            }
        }
        return true;
    } catch (err) {
        console.error('Bucket check failed:', err);
        return false;
    }
}
