 export interface VisionResponse {
   description: string;
   hazards: string[];
   priority: number;
 }

type GroqModelsResponse = {
  data?: Array<{ id: string }>;
};

async function pickGroqVisionModel(apiKey: string): Promise<string> {
  // Groq supports the OpenAI-compatible Models API.
  const resp = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!resp.ok) {
    // If we can't list models (common in browsers due to CORS), we can't safely auto-pick.
    // Return empty so the caller can use a user-provided model id.
    return "";
  }

  const data = (await resp.json().catch(() => ({}))) as GroqModelsResponse;
  const ids = (data.data || []).map((m) => m.id).filter(Boolean);

  // Prefer stable (non-preview) vision models first.
  const preferredOrder = [
    // Common Groq vision naming patterns (best-effort).
    "llama-3.2-11b-vision",
    "llama-3.2-90b-vision",
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview",
  ];

  for (const preferred of preferredOrder) {
    const match = ids.find((id) => id === preferred);
    if (match) return match;
  }

  // Otherwise pick the first model that looks like it supports vision.
  const visionLike = ids.find((id) => /vision/i.test(id));
  if (visionLike) return visionLike;

  // No vision models found.
  return "";
}
 
 export async function analyzeImageWithOpenAI(
   base64Image: string,
  apiKey: string,
  opts?: { model?: string }
 ): Promise<VisionResponse> {
  const model = opts?.model?.trim() || (await pickGroqVisionModel(apiKey));
  if (!model) {
    throw new Error(
      "No Groq vision model configured. Paste a supported Groq vision model ID in Settings."
    );
  }

   const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${apiKey}`,
     },
     body: JSON.stringify({
      model,
       messages: [
         {
           role: "system",
           content:
             'You are an assistive vision AI. Analyze images for visually impaired users. Return a strict JSON object: { "description": "concise scene description", "hazards": ["list of physical hazards"], "priority": 1-10 }. If priority > 7, keep the description extremely short and focus on the danger. Return ONLY the JSON object, no markdown or other text.',
         },
         {
           role: "user",
           content: [
             {
               type: "image_url",
               image_url: {
                 url: `data:image/jpeg;base64,${base64Image}`,
               },
             },
             {
               type: "text",
               text: "Analyze this image for a visually impaired user.",
             },
           ],
         },
       ],
       max_tokens: 500,
     }),
   });
 
   if (!response.ok) {
     const errorData = await response.json().catch(() => ({}));
     const errorMessage = errorData?.error?.message || "API request failed";
 
     if (response.status === 429) {
       throw new Error("Rate limit exceeded. Please wait and try again.");
     }
     if (response.status === 401) {
       throw new Error("Invalid API key. Please check your Groq key in settings.");
     }
     throw new Error(errorMessage);
   }
 
   const data = await response.json();
   const content = data.choices?.[0]?.message?.content;
 
   if (!content) {
     throw new Error("No response content from OpenAI");
   }
 
   // Parse JSON from response (handle potential markdown code blocks)
   let jsonStr = content.trim();
   if (jsonStr.startsWith("```json")) {
     jsonStr = jsonStr.slice(7);
   }
   if (jsonStr.startsWith("```")) {
     jsonStr = jsonStr.slice(3);
   }
   if (jsonStr.endsWith("```")) {
     jsonStr = jsonStr.slice(0, -3);
   }
 
   return JSON.parse(jsonStr.trim());
 }