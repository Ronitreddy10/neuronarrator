 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 // Current recommended vision model from Groq
 const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
 
const GENERAL_PROMPT = `You are a helpful friend guiding a blind person through their surroundings. Speak naturally and conversationally, like you're walking beside them. Describe what you see in a warm, clear way.

Respond in JSON format:
{
 "text_content": "Any legible text visible in the image (signs, documents, screens) - transcribe verbatim. Empty string if no text.",
  "description": "Your friendly description of what's ahead (max 2 sentences, use 'you' perspective)",
  "hazards": ["list", "of", "potential", "hazards"],
  "priority": 1-10 (1=safe, 10=immediate danger)
}

How to describe:
- Use "you" perspective: "There's a doorway ahead of you" not "A doorway is visible"
- Be specific but friendly: "You're facing a busy street with cars passing" 
- Mention distances when helpful: "About 3 steps ahead..."
- Always note readable text first, then the scene
- Warn about obstacles naturally: "Watch out, there's a curb coming up"
- Keep it calm and reassuring, even for hazards
- IMPORTANT: If known people's names are provided, use their actual names instead of generic descriptions like "a man" or "a woman". For example say "Ronit is standing in front of you" instead of "A man is standing in front of you".

Be concise but human. You're their eyes - make them feel confident and safe.`;
 
 const READER_PROMPT = `You are a friendly assistant reading text aloud for a blind person. Speak naturally, like you're reading to a friend.
 
 Respond in JSON format:
{
   "text_content": "Read all visible text naturally. Include signs, labels, documents, screens, books. Read in logical order.",
   "description": "Brief friendly context (e.g., 'This looks like a menu on the wall' or 'You're pointing at a street sign')",
  "hazards": [],
  "priority": 1
}

 How to read:
 - Start with brief context of what you're reading
 - Read text naturally, not robotically
 - For prices: "twelve ninety-nine" not "$12.99"
 - For dates: "March 15th" not "03/15"
 - If no text: "I don't see any text here, just [brief scene description]"
 - Be helpful: "This says..." or "It reads..."`;

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
 
    const { imageBase64, mode = "general", knownFaces = [] } = await req.json();
      
      if (!imageBase64) {
       return new Response(
         JSON.stringify({ error: "No image provided" }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
    const systemPrompt = mode === "reader" ? READER_PROMPT : GENERAL_PROMPT;
    // Build user prompt - include known face names if available
    let userPrompt = mode === "reader" 
       ? "Please read any text you can see in this image."
       : "What's in front of me? Help me understand my surroundings.";
    
    if (knownFaces.length > 0 && mode !== "reader") {
      const faceInfo = knownFaces.map((f: any) => `${f.name} (${f.relation})`).join(", ");
      userPrompt += `\n\nKnown people detected in this image: ${faceInfo}. Please use their actual names in your description.`;
    }

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