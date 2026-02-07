import { supabase } from "@/integrations/supabase/client";

export interface VisionResponse {
  text_content: string;
  description: string;
  hazards: string[];
  priority: number;
  // Finder mode specific
  found?: boolean;
}

export type VisionMode = "general" | "reader" | "currency" | "finder";

export interface KnownFaceInfo {
  name: string;
  relation: string;
  daysSinceLastSeen?: number;
  isLongAbsence?: boolean;
}

export async function analyzeImage(
  base64Image: string,
  mode: VisionMode = "general",
  knownFaces: KnownFaceInfo[] = [],
  previousDescription: string = "",
  targetItem: string = ""
): Promise<VisionResponse> {
  const { data, error } = await supabase.functions.invoke("analyze-image", {
    body: { imageBase64: base64Image, mode, knownFaces, previousDescription, targetItem },
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error(error.message || "Analysis failed");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    text_content: data.text_content || "",
    description: data.description || "Unable to analyze image",
    hazards: data.hazards || [],
    priority: data.priority || 5,
    found: data.found,
  };
}