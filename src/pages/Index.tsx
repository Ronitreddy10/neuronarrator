 import { useState, useCallback } from "react";
import { DynamicIsland } from "@/components/DynamicIsland";
 import { ImageUploadZone } from "@/components/ImageUploadZone";
import { ControlDeck } from "@/components/ControlDeck";
 import { SettingsModal, getStoredApiKey, getStoredVisionModel } from "@/components/SettingsModal";
 import { WarningBanner } from "@/components/WarningBanner";
 import { CaptionDisplay } from "@/components/CaptionDisplay";
 import { useNeuroVoice } from "@/hooks/useNeuroVoice";
 import { useHaptics } from "@/hooks/useHaptics";
 import { useHapticBraille } from "@/hooks/useHapticBraille";
 import { HapticBrailleIndicator } from "@/components/HapticBrailleIndicator";
 import { analyzeImageWithOpenAI } from "@/services/vision";
 
 type AnalysisState = "idle" | "analyzing" | "success" | "warning" | "error";

const Index = () => {
   const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
   const [uploadedImage, setUploadedImage] = useState<string | null>(null);
   const [settingsOpen, setSettingsOpen] = useState(false);
   const [captionText, setCaptionText] = useState("");
   const [priority, setPriority] = useState(0);
   const [showWarning, setShowWarning] = useState(false);
 
   const { speak, stop } = useNeuroVoice();
   const { sosPattern } = useHaptics();
   const { playHapticMessage, stopHaptic, isPlaying: isHapticPlaying, currentChar, currentDots } = useHapticBraille();
 
   const handleImageSelect = (base64: string) => {
     setUploadedImage(base64);
     setAnalysisState("idle");
     setCaptionText("");
     setPriority(0);
     setShowWarning(false);
     stop();
     stopHaptic();
   };
 
   const handleClearImage = () => {
     setUploadedImage(null);
     setAnalysisState("idle");
     setCaptionText("");
     setPriority(0);
     setShowWarning(false);
     stop();
     stopHaptic();
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
      const result = await analyzeImageWithOpenAI(uploadedImage, apiKey, {
        model: getStoredVisionModel(),
      });
 
       setPriority(result.priority);
       setCaptionText(result.description);
 
       // Handle high priority hazards
       if (result.priority > 7) {
         setAnalysisState("warning");
         setShowWarning(true);
         sosPattern();
         speak(`Warning! ${result.description}`, 10);
         // Extract hazard keyword and play Braille haptic
         const hazardWord = result.description.split(" ").slice(0, 2).join(" ");
         playHapticMessage(hazardWord);
       } else {
         setAnalysisState("success");
         speak(result.description, 5);
       }
     } catch (error) {
       console.error("Analysis error:", error);
       setAnalysisState("error");
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      speak("System Error. " + errorMsg, 10);
      setCaptionText(errorMsg);
     }
   }, [uploadedImage, speak, sosPattern, playHapticMessage]);
 
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
 
       {/* Haptic Braille Indicator */}
       <HapticBrailleIndicator
         isPlaying={isHapticPlaying}
         currentChar={currentChar}
         currentDots={currentDots}
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
