 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 // Current recommended vision model from Groq
 const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
 
const GENERAL_PROMPT = `You're a chill, caring friend walking beside a blind person. Talk like a real human — casual, warm, not robotic. No jargon, no "I observe", no "the image shows". Just talk to them like you're right there.

You MUST respond with ONLY valid JSON — no extra text before or after:
{"text_content":"Any text you can read (signs, screens, labels) — copy word-for-word. Empty string if none.","description":"What you'd actually say to your friend (max 2 sentences, 'you' perspective)","hazards":["any dangers"],"priority":1}

Rules:
- ALWAYS describe what you actually see: furniture, objects, screens, TVs, windows, walls, shelves, everything relevant. Don't be lazy.
- Talk like a friend: "Hey there's a TV right in front of you, and some shelves to the left" not "A commercial establishment is located to your left"
- Be specific: mention objects, colors, positions. "There's a black TV on a stand ahead, some shelves with stuff on your right"
- Distances matter: "Like 5 steps ahead there's a chair"
- Hazards stay calm: "Heads up, stairs coming" not "WARNING: STAIRS DETECTED"
- If you know someone's name, USE IT. Say "Ronit's right in front of you" not "A man is in front of you"
- If someone is a family member or friend, mention it warmly: "Hey, your friend Ronit is here!" or "It's your doctor, Dr. Shah"
- If it's been a while since you last saw them, mention it naturally: "Oh nice, it's Ronit! You haven't seen him in like a week"
- If you just saw them today, DON'T mention timing — just use their name naturally

Scene Memory:
- You may be given what you said last time. If the scene barely changed, mention something you didn't say before or a small new detail.
- NEVER say "nothing new" or "same as before" — there's always something to describe.
- Don't repeat the exact same sentence. Rephrase or highlight different objects.

CRITICAL: Output ONLY the JSON object. No markdown, no backticks, no extra words.`;

const READER_PROMPT = `You're reading text out loud for a blind friend. Be natural — like you're just telling them what it says.

You MUST respond with ONLY valid JSON — no extra text before or after:
{"text_content":"Read all visible text naturally. Signs, labels, screens, books — in logical order.","description":"Quick context like 'Looks like a menu' or 'There's a sign on the wall'","hazards":[],"priority":1}

How to read:
- Quick context first: "This says..." or "Looks like a label, it reads..."
- Read naturally: "twelve bucks" not "$12.00"
- Dates: "March 15th" not "03/15"
- No text? Just say "No text here, just [quick scene]"

CRITICAL: Output ONLY the JSON object. No markdown, no backticks, no extra words.`;

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
      const faceLines = knownFaces.map((f: any) => {
        let line = `${f.name} — ${f.relation}`;
        if (f.daysSinceLastSeen !== undefined && f.daysSinceLastSeen > 0) {
          if (f.daysSinceLastSeen === 1) line += ` (last seen yesterday)`;
          else if (f.daysSinceLastSeen < 7) line += ` (last seen ${f.daysSinceLastSeen} days ago)`;
          else if (f.daysSinceLastSeen < 30) line += ` (last seen about ${Math.round(f.daysSinceLastSeen / 7)} weeks ago)`;
          else line += ` (last seen about ${Math.round(f.daysSinceLastSeen / 30)} months ago)`;
        } else if (f.daysSinceLastSeen === 0) {
          line += ` (seen just now / today)`;
        }
        return line;
      }).join("; ");
      userPrompt += `\n\nPeople I recognize here: ${faceLines}. Use their names naturally. Mention their relationship and when you last saw them if it's been a while (more than a day). If you just saw them today, don't mention timing.`;
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
 
      let content = data.choices?.[0]?.message?.content || "";
      
      // Strip Llama model artifacts that corrupt JSON (e.g. <|end_header_id|>, <|eot_id|>)
      content = content.replace(/<\|[^|]*\|>/g, "").replace(/\bassistant\b/g, "");
      
      // Parse JSON from response with multiple fallback strategies
      let result = { text_content: "", description: "", hazards: [] as string[], priority: 5 };
      let parsed = false;
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          // Clean the matched JSON — remove control chars, fix common issues
          let jsonStr = jsonMatch[0]
            .replace(/[\x00-\x1F\x7F]/g, " ")  // strip control characters
            .replace(/,\s*}/g, "}")              // trailing commas
            .replace(/,\s*]/g, "]");             // trailing commas in arrays
          
          const p = JSON.parse(jsonStr);
          result = {
            text_content: p.text_content || "",
            description: p.description || "",
            hazards: Array.isArray(p.hazards) ? p.hazards : [],
            priority: Math.min(10, Math.max(1, Number(p.priority) || 5)),
          };
          parsed = true;
        }
      } catch (parseError) {
        console.warn("JSON.parse failed, trying regex extraction:", parseError);
      }
      
      // Fallback: extract description via regex if JSON parse failed
      if (!parsed || !result.description) {
        const descMatch = content.match(/"description"\s*:\s*"([^"]+)"/);
        if (descMatch) {
          result.description = descMatch[1];
        } else {
          // Last resort: strip all JSON-like syntax and use cleaned content
          result.description = content
            .replace(/[{}":\[\]]/g, "")
            .replace(/text_content|description|hazards|priority/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 200) || "I'm having trouble seeing right now, one sec.";
        }
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