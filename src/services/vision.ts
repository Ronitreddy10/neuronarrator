 import { supabase } from "@/integrations/supabase/client";
 
 export interface VisionResponse {
   description: string;
   hazards: string[];
   priority: number;
 }
 
 export async function analyzeImage(base64Image: string): Promise<VisionResponse> {
   const { data, error } = await supabase.functions.invoke("analyze-image", {
     body: { imageBase64: base64Image },
   });
 
   if (error) {
     console.error("Edge function error:", error);
     throw new Error(error.message || "Analysis failed");
   }
 
   if (data?.error) {
     throw new Error(data.error);
   }
 
   return {
     description: data.description || "Unable to analyze image",
     hazards: data.hazards || [],
     priority: data.priority || 5,
   };
 }