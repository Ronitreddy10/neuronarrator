 import { useState, useCallback } from "react";
import { DynamicIsland } from "@/components/DynamicIsland";
 import { ImageUploadZone } from "@/components/ImageUploadZone";
import { ControlDeck } from "@/components/ControlDeck";
 import { SettingsModal, getStoredApiKey } from "@/components/SettingsModal";
 import { WarningBanner } from "@/components/WarningBanner";
 import { CaptionDisplay } from "@/components/CaptionDisplay";
 import { useNeuroVoice } from "@/hooks/useNeuroVoice";
 import { useHaptics } from "@/hooks/useHaptics";
 
 type AnalysisState = "idle" | "analyzing" | "success" | "warning" | "error";
 
 interface GeminiResponse {
   description: string;
   hazards: string[];
   priority: number;
 }

const Index = () => {
   const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
   const [uploadedImage, setUploadedImage] = useState<string | null>(null);
   const [settingsOpen, setSettingsOpen] = useState(false);
   const [captionText, setCaptionText] = useState("");
   const [priority, setPriority] = useState(0);
   const [showWarning, setShowWarning] = useState(false);
 
   const { speak, stop } = useNeuroVoice();
   const { sosPattern } = useHaptics();
 
   const handleImageSelect = (base64: string) => {
     setUploadedImage(base64);
     setAnalysisState("idle");
     setCaptionText("");
     setPriority(0);
     setShowWarning(false);
     stop();
   };
 
   const handleClearImage = () => {
     setUploadedImage(null);
     setAnalysisState("idle");
     setCaptionText("");
     setPriority(0);
     setShowWarning(false);
     stop();
   };
 
   const analyzeImage = useCallback(async () => {
     const apiKey = getStoredApiKey();
     
     if (!apiKey) {
       speak("Please configure your API key in settings.", 10);
       setSettingsOpen(true);
       return;
     }
 
     if (!uploadedImage) return;
 
     setAnalysisState("analyzing");
     setCaptionText("");
     setPriority(0);
     setShowWarning(false);
 
     try {
       const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
         {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
           },
           body: JSON.stringify({
             contents: [
               {
                 parts: [
                   {
                     text: `You are an assistive vision AI. Analyze this image for a visually impaired user. Return a strict JSON object: { "description": "concise scene description", "hazards": ["list of physical hazards"], "priority": 1-10 }. If priority > 7, keep the description extremely short and focus on the danger. Return ONLY the JSON object, no markdown or other text.`,
                   },
                   {
                     inline_data: {
                       mime_type: "image/jpeg",
                       data: uploadedImage,
                     },
                   },
                 ],
               },
             ],
           }),
         }
       );
 
       if (!response.ok) {
         throw new Error("API request failed");
       }
 
       const data = await response.json();
       const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
 
       if (!textContent) {
         throw new Error("No response content");
       }
 
       // Parse JSON from response (handle potential markdown code blocks)
       let jsonStr = textContent.trim();
       if (jsonStr.startsWith("```json")) {
         jsonStr = jsonStr.slice(7);
       }
       if (jsonStr.startsWith("```")) {
         jsonStr = jsonStr.slice(3);
       }
       if (jsonStr.endsWith("```")) {
         jsonStr = jsonStr.slice(0, -3);
       }
 
       const result: GeminiResponse = JSON.parse(jsonStr.trim());
 
       setPriority(result.priority);
       setCaptionText(result.description);
 
       // Handle high priority hazards
       if (result.priority > 7) {
         setAnalysisState("warning");
         setShowWarning(true);
         sosPattern();
         speak(`Warning! ${result.description}`, 10);
       } else {
         setAnalysisState("success");
         speak(result.description, 5);
       }
     } catch (error) {
       console.error("Analysis error:", error);
       setAnalysisState("error");
       speak("System Error. Please check connection.", 10);
       setCaptionText("Error analyzing image. Please check your API key and try again.");
     }
   }, [uploadedImage, speak, sosPattern]);
 
   const getStatusText = () => {
     if (analysisState === "analyzing") return "Processing visual context...";
     if (analysisState === "warning") return "Hazard identified - voice alert active";
     if (analysisState === "success") return "Analysis complete";
     if (analysisState === "error") return "Error - check settings";
     if (uploadedImage) return "Image ready - tap to analyze";
     return "Upload an image to begin";
   };

  return (
    <div className="min-h-screen bg-background flex flex-col">
       {/* Warning Banner */}
       <WarningBanner isVisible={showWarning} />
 
      {/* Dynamic Island */}
       <div className={`flex justify-center pt-4 pb-6 ${showWarning ? "mt-16" : ""}`}>
         <DynamicIsland status={analysisState} priority={priority} />
      </div>

       {/* Main Content - Image Upload Zone */}
      <div className="flex-1 flex items-start justify-center px-4 pb-40">
        <div className="w-full max-w-sm">
           <ImageUploadZone
             onImageSelect={handleImageSelect}
             uploadedImage={uploadedImage}
             onClear={handleClearImage}
             analysisState={analysisState}
             priority={priority}
           />
          
          {/* Status Text Below Viewfinder */}
          <div className="mt-6 text-center">
            <h1 className="text-xl font-semibold tracking-tighter text-foreground">
              NeuroNarrator
            </h1>
            <p className="text-sm text-muted-foreground mt-1 tracking-tight">
               {getStatusText()}
            </p>
          </div>
        </div>
      </div>

       {/* Caption Display */}
       <CaptionDisplay
         text={captionText}
         isVisible={analysisState === "success" || analysisState === "warning" || analysisState === "error"}
         priority={priority}
       />
 
       {/* Control Deck */}
       <ControlDeck
         isActive={analysisState === "analyzing"}
         onToggle={() => {}}
         onSettingsClick={() => setSettingsOpen(true)}
         onAnalyze={analyzeImage}
         hasImage={!!uploadedImage}
         isAnalyzing={analysisState === "analyzing"}
       />
 
       {/* Settings Modal */}
       <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default Index;
