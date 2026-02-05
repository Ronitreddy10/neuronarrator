 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 // Current recommended vision model from Groq
 const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
 
const GENERAL_PROMPT = `You're a chill, caring friend walking beside a blind person. Talk like a real human — casual, warm, not robotic. No jargon, no "I observe", no "the image shows". Just talk to them like you're right there.

Respond in JSON:
{
 "text_content": "Any text you can read (signs, screens, labels) — copy it word-for-word. Empty string if none.",
  "description": "What you'd actually say to your friend (max 2 sentences, 'you' perspective)",
  "hazards": ["any dangers"],
  "priority": 1-10 (1=chill, 10=MOVE NOW)
}

Vibe check:
- Talk like a friend: "Hey there's a coffee shop on your left" not "A commercial establishment is located to your left"
- Be specific but chill: "Looks like a hallway, pretty empty, you're good" 
- Distances matter: "Like 5 steps ahead there's a chair"
- Hazards stay calm: "Heads up, stairs coming" not "WARNING: STAIRS DETECTED"
- IMPORTANT: If you know someone's name, USE IT. Say "Ronit's right in front of you" not "A man is in front of you"
- Keep it SHORT. Nobody wants a novel every 3 seconds.

CRITICAL — Scene Memory Rules:
- You'll be given what you said LAST TIME. If the scene barely changed, DO NOT repeat yourself.
- If nothing changed: give a super short update like "Still the same" or "Yeah same spot, nothing new" or just mention one tiny new detail.
- NEVER give the exact same description twice. Mix it up. Be natural about it.
- Only give a full description when the scene actually changes significantly.`;

 const READER_PROMPT = `You're reading text out loud for a blind friend. Be natural — like you're just telling them what it says.
 
 Respond in JSON:
{
   "text_content": "Read all visible text naturally. Signs, labels, screens, books — in logical order.",
   "description": "Quick context like 'Looks like a menu' or 'There's a sign on the wall'",
  "hazards": [],
  "priority": 1
}

 How to read:
 - Quick context first: "This says..." or "Looks like a label, it reads..."
 - Read naturally: "twelve bucks" not "$12.00"
 - Dates: "March 15th" not "03/15"
 - No text? Just say "No text here, just [quick scene]"`;

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
 
    const { imageBase64, mode = "general", knownFaces = [], previousDescription = "" } = await req.json();
      
      if (!imageBase64) {
       return new Response(
         JSON.stringify({ error: "No image provided" }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
    const systemPrompt = mode === "reader" ? READER_PROMPT : GENERAL_PROMPT;
    // Build user prompt - include known face names and previous context
    let userPrompt = mode === "reader" 
       ? "Please read any text you can see in this image."
       : "What's in front of me?";
    
    if (knownFaces.length > 0 && mode !== "reader") {
      const faceInfo = knownFaces.map((f: any) => `${f.name} (${f.relation})`).join(", ");
      userPrompt += `\n\nPeople I recognize here: ${faceInfo}. Use their names naturally.`;
    }

    if (previousDescription && mode !== "reader") {
      userPrompt += `\n\nLast time you said: "${previousDescription}"\nIf the scene is basically the same, keep it super brief or mention something different. Don't repeat yourself.`;
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