 export interface VisionResponse {
   description: string;
   hazards: string[];
   priority: number;
 }
 
 export async function analyzeImageWithOpenAI(
   base64Image: string,
   apiKey: string
 ): Promise<VisionResponse> {
   const response = await fetch("https://api.x.ai/v1/chat/completions", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${apiKey}`,
     },
     body: JSON.stringify({
       model: "grok-2-vision-1212",
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
       throw new Error("Invalid API key. Please check your Grok key in settings.");
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