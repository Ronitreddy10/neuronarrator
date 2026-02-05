 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 // Current recommended vision model from Groq
 const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
 
const GENERAL_PROMPT = `You are an AI vision assistant for a blind navigation app. Analyze the image and respond in JSON format:
 {
  "text_content": "Any legible text visible in the image (signs, documents, screens) - transcribe verbatim. Empty string if no text.",
   "description": "A clear, concise description of the scene (max 2 sentences)",
   "hazards": ["list", "of", "potential", "hazards"],
   "priority": 1-10 (1=safe, 10=immediate danger)
 }
 
 Focus on:
- First, identify and transcribe any readable text (signs, labels, screens, documents)
 - Obstacles in the path (stairs, curbs, poles, furniture)
 - Moving hazards (vehicles, cyclists, people)
 - Environmental dangers (water, holes, construction)
 - Navigation aids (doors, crosswalks, railings)
 
 Be concise but specific. Prioritize safety-critical information.`;
 
const READER_PROMPT = `You are a text reading assistant for a blind user. Your ONLY job is to read text visible in the image. Respond in JSON format:
{
  "text_content": "Transcribe ALL legible text exactly as written. Include signs, labels, documents, screens, books, etc. If multiple text areas, read them in logical order (top to bottom, left to right).",
  "description": "Brief note about text location/context (e.g., 'Text on a street sign', 'Document on table')",
  "hazards": [],
  "priority": 1
}

IMPORTANT: 
- Focus ONLY on reading text, ignore objects and scenery
- If no text is visible, set text_content to "No readable text detected"
- Preserve formatting like line breaks where logical
- Read numbers, prices, dates exactly as shown`;

 serve(async (req) => {
   // Handle CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
     if (!GROQ_API_KEY) {
       console.error("GROQ_API_KEY not configured");
       return new Response(
         JSON.stringify({ error: "API key not configured" }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
    const { imageBase64, mode = "general" } = await req.json();
     
     if (!imageBase64) {
       return new Response(
         JSON.stringify({ error: "No image provided" }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
    const systemPrompt = mode === "reader" ? READER_PROMPT : GENERAL_PROMPT;
    const userPrompt = mode === "reader" 
      ? "Read and transcribe all visible text in this image for a blind user."
      : "Analyze this image for a blind user. Identify any text, hazards and navigation information.";

    console.log("Calling Groq vision API with model:", VISION_MODEL, "mode:", mode);
 
     const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
       method: "POST",
       headers: {
         "Authorization": `Bearer ${GROQ_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: VISION_MODEL,
         messages: [
           {
             role: "system",
            content: systemPrompt,
           },
           {
             role: "user",
             content: [
               {
                 type: "image_url",
                 image_url: {
                   url: imageBase64.startsWith("data:")
                     ? imageBase64
                     : `data:image/jpeg;base64,${imageBase64}`,
                 },
               },
               {
                 type: "text",
                text: userPrompt,
               },
             ],
           },
         ],
        max_tokens: 1000,
         temperature: 0.3,
       }),
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error("Groq API error:", response.status, errorText);
       return new Response(
         JSON.stringify({ error: `Vision API error: ${response.status}`, details: errorText }),
         { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const data = await response.json();
     console.log("Groq response received");
 
     const content = data.choices?.[0]?.message?.content || "";
     
     // Parse JSON from response
    let result = { text_content: "", description: content, hazards: [], priority: 5 };
     try {
       const jsonMatch = content.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
         const parsed = JSON.parse(jsonMatch[0]);
         result = {
          text_content: parsed.text_content || "",
           description: parsed.description || content,
           hazards: parsed.hazards || [],
           priority: Math.min(10, Math.max(1, parsed.priority || 5)),
         };
       }
     } catch (parseError) {
       console.warn("Could not parse JSON from response, using raw content");
     }
 
     return new Response(
       JSON.stringify(result),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error("Edge function error:", error);
     const errorMessage = error instanceof Error ? error.message : "Internal server error";
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });