 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 serve(async (req) => {
   // Handle CORS preflight
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const SARVAM_API_KEY = Deno.env.get('SARVAM_API_KEY');
     if (!SARVAM_API_KEY) {
       console.error("SARVAM_API_KEY not configured");
       return new Response(
         JSON.stringify({ error: "Sarvam API key not configured" }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const { text, speaker = "anushka" } = await req.json();
 
     if (!text || !text.trim()) {
       return new Response(
         JSON.stringify({ error: "No text provided" }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Truncate text to 500 chars max to keep response fast
     const truncatedText = text.slice(0, 500);
 
     console.log("Calling Sarvam TTS API with speaker:", speaker, "text length:", truncatedText.length);
 
     const response = await fetch("https://api.sarvam.ai/text-to-speech", {
       method: "POST",
       headers: {
         "api-subscription-key": SARVAM_API_KEY,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         inputs: [truncatedText],
         target_language_code: "en-IN",
         speaker: speaker, // "anushka" (female) or "abhilash" (male)
         model: "bulbul:v2",
         pitch: 0,
         pace: 1.1,
         loudness: 1.5,
         speech_sample_rate: 22050,
         enable_preprocessing: true,
       }),
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error("Sarvam TTS API error:", response.status, errorText);
       return new Response(
         JSON.stringify({ error: `TTS API error: ${response.status}`, details: errorText }),
         { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const data = await response.json();
     console.log("Sarvam TTS response received");
 
     // Sarvam returns audio as base64 in the 'audios' array
     const audioBase64 = data.audios?.[0];
 
     if (!audioBase64) {
       console.error("No audio in Sarvam response:", data);
       return new Response(
         JSON.stringify({ error: "No audio returned from TTS API" }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     return new Response(
       JSON.stringify({ audioBase64 }),
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