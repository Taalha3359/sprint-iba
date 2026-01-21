import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Always return JSON with CORS headers
    const jsonResponse = (data: any, status = 200) => {
        return new Response(
            JSON.stringify(data),
            {
                status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { filePath, bucketName = 'pdfs', originalName } = await req.json()

        if (!filePath) {
            return jsonResponse({ error: 'No file path provided' }, 400)
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const geminiKey = Deno.env.get('GEMINI_API_KEY')

        if (!geminiKey) {
            return jsonResponse({ error: 'GEMINI_API_KEY not configured' }, 500)
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Download PDF from storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(filePath)

        if (downloadError) throw downloadError

        // 2. Upload to Gemini File API
        // Note: Edge Functions have file system limitations, so we'll use the fetch API directly
        const fileBlob = new Blob([fileData], { type: 'application/pdf' });

        // Initial upload request to get the upload URL
        const uploadUrlResponse = await fetch(
            `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`,
            {
                method: 'POST',
                headers: {
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': fileBlob.size.toString(),
                    'X-Goog-Upload-Header-Content-Type': 'application/pdf',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file: { display_name: originalName || filePath } })
            }
        );

        if (!uploadUrlResponse.ok) {
            throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText}`);
        }

        const uploadUrl = uploadUrlResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) {
            throw new Error('No upload URL returned');
        }

        // Upload the actual file content
        const uploadFileResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': fileBlob.size.toString(),
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize',
            },
            body: fileBlob
        });

        if (!uploadFileResponse.ok) {
            throw new Error(`Failed to upload file: ${uploadFileResponse.statusText}`);
        }

        const fileInfo = await uploadFileResponse.json();
        const fileUri = fileInfo.file.uri;

        // Wait for file to be active
        let fileState = fileInfo.file.state;
        while (fileState === 'PROCESSING') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const stateResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/files/${fileInfo.file.name.split('/').pop()}?key=${geminiKey}`
            );
            const stateData = await stateResponse.json();
            fileState = stateData.state;
            if (fileState === 'FAILED') {
                throw new Error('File processing failed');
            }
        }

        // 3. Process with Gemini (Whole File)
        const prompt = `
        Task: Extract ALL Multiple Choice Questions (MCQs) from this PDF document.
        
        Output Format: Return a strict JSON array of objects. Each object must have:
        - question_text: The complete question text
        - options: Object with keys A, B, C, D containing the option text
        - correct_answer: Single letter (A, B, C, or D) indicating the correct answer
        - topic: Main subject/topic area
        - subtopic: Specific subtopic or concept
        - difficulty: One of: Easy, Medium, or Hard
        - explanation: Detailed explanation of why the correct answer is right
        - has_image: boolean - true if question references an image/diagram/chart
        - image_description: string or null - description of the image if has_image is true, otherwise null

        Critical Requirements:
        1. LATEX FORMATTING: Use LaTeX for ALL mathematical expressions, formulas, equations, and symbols
           - Inline math: $x^2 + y^2 = z^2$
           - Fractions: $\\frac{a}{b}$
           - Subscripts/Superscripts: $x_1$, $y^2$
           - Greek letters: $\\alpha$, $\\beta$, $\\pi$
           - Square roots: $\\sqrt{x}$
           
        2. IMAGE DETECTION: If a question mentions "refer to figure", "see diagram", "shown above", or similar:
           - Set has_image: true
           - Provide detailed image_description explaining what the image shows
           
        3. COMPLETENESS: Extract EVERY question in the document, don't skip any
        
        4. ACCURACY: Double-check that the correct_answer letter matches the right option
        
        5. EXPLANATION: Provide clear, educational explanations for each answer
        
        Example output structure:
        [
          {
            "question_text": "What is the value of $x$ in the equation $2x + 5 = 13$?",
            "options": {
              "A": "$x = 3$",
              "B": "$x = 4$",
              "C": "$x = 5$",
              "D": "$x = 6$"
            },
            "correct_answer": "B",
            "topic": "Algebra",
            "subtopic": "Linear Equations",
            "difficulty": "Easy",
            "explanation": "Solving for $x$: $2x + 5 = 13$ → $2x = 8$ → $x = 4$",
            "has_image": false,
            "image_description": null
          }
        ]
        
        Return ONLY the JSON array, no additional text.
      `

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [
                            { file_data: { mime_type: "application/pdf", file_uri: fileUri } },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1
                    }
                })
            }
        )

        if (!response.ok) {
            console.error(`Gemini API error: ${response.statusText}`)
            throw new Error(`Gemini API error: ${response.statusText}`)
        }

        const data = await response.json()

        let totalPromptTokens = 0
        let totalCandidateTokens = 0
        let totalTokens = 0

        // Track token usage
        if (data.usageMetadata) {
            totalPromptTokens = data.usageMetadata.promptTokenCount || 0
            totalCandidateTokens = data.usageMetadata.candidatesTokenCount || 0
            totalTokens = data.usageMetadata.totalTokenCount || 0
        }

        const allQuestions = []
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawText) {
            try {
                const questions = JSON.parse(rawText)
                if (Array.isArray(questions)) {
                    allQuestions.push(...questions)
                }
            } catch (e) {
                console.error('Failed to parse Gemini response', e)
            }
        }

        // 4. Insert into database
        if (allQuestions.length > 0) {
            const questionsToInsert = allQuestions.map(q => ({
                question_text: q.question_text,
                options: [q.options.A, q.options.B, q.options.C, q.options.D],
                correct_answer: q.correct_answer,
                topic: q.topic,
                subtopic: q.subtopic,
                difficulty: q.difficulty?.toLowerCase() || 'medium',
                explanation: q.explanation,
                subject: q.topic,
                is_verified: false // Assuming this column exists or will be added
            }))

            const { error: insertError } = await supabase
                .from('questions')
                .insert(questionsToInsert)

            if (insertError) throw insertError
        }

        // 5. Log extraction stats
        await supabase.from('extraction_logs').insert({
            file_name: originalName || filePath,
            total_tokens: totalTokens,
            prompt_tokens: totalPromptTokens,
            completion_tokens: totalCandidateTokens,
            question_count: allQuestions.length,
            status: 'completed'
        })


        return jsonResponse({
            success: true,
            count: allQuestions.length,
            tokens: {
                total: totalTokens,
                prompt: totalPromptTokens,
                completion: totalCandidateTokens
            }
        })

    } catch (error: any) {
        console.error('Extraction error:', error)
        return jsonResponse({
            error: error.message || 'Unknown error occurred',
            details: error.toString()
        }, 500)
    }
})
