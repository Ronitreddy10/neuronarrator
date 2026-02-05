 import { useState, useCallback, useRef } from "react";
import { DynamicIsland } from "@/components/DynamicIsland";
 import { LiveCamera } from "@/components/LiveCamera";
import { ControlDeck } from "@/components/ControlDeck";
 import { SettingsModal } from "@/components/SettingsModal";
 import { WarningBanner } from "@/components/WarningBanner";
 import { CaptionDisplay } from "@/components/CaptionDisplay";
 import { useNeuroVoice } from "@/hooks/useNeuroVoice";
 import { useHaptics } from "@/hooks/useHaptics";
 import { useHapticBraille } from "@/hooks/useHapticBraille";
 import { useHazardSound } from "@/hooks/useHazardSound";
 import { HapticBrailleIndicator } from "@/components/HapticBrailleIndicator";
 import { analyzeImage as analyzeImageService } from "@/services/vision";
 
 type AnalysisState = "idle" | "analyzing" | "success" | "warning" | "error";

const Index = () => {
   const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
   const [isAutoCapturing, setIsAutoCapturing] = useState(false);
   const [settingsOpen, setSettingsOpen] = useState(false);
   const [captionText, setCaptionText] = useState("");
   const [priority, setPriority] = useState(0);
   const [showWarning, setShowWarning] = useState(false);
   const isAnalyzingRef = useRef(false);
 
   const { speak, stop } = useNeuroVoice();
   const { sosPattern } = useHaptics();
   const { playHapticMessage, stopHaptic, isPlaying: isHapticPlaying, currentChar, currentDots } = useHapticBraille();
   const { playHazardSound } = useHazardSound();
 
   const handleCapture = useCallback(async (base64: string) => {
     // Prevent concurrent requests
     if (isAnalyzingRef.current) return;
     isAnalyzingRef.current = true;
 
     setAnalysisState("analyzing");
 
     try {
       const result = await analyzeImageService(base64);
 
       setPriority(result.priority);
       setCaptionText(result.description);
 
       // Handle high priority hazards
       if (result.priority > 7) {
         setAnalysisState("warning");
         setShowWarning(true);
         sosPattern();
         playHazardSound(result.priority);
         speak(`Warning! ${result.description}`, 10);
         // Extract hazard keyword and play Braille haptic
         const hazardWord = result.description.split(" ").slice(0, 2).join(" ");
         playHapticMessage(hazardWord);
       } else {
         setAnalysisState("success");
         setShowWarning(false);
         playHazardSound(result.priority);
         speak(result.description, 5);
       }
     } catch (error) {
       console.error("Analysis error:", error);
       setAnalysisState("error");
       const errorMsg = error instanceof Error ? error.message : "Unknown error";
       speak("System Error. " + errorMsg, 10);
       setCaptionText(errorMsg);
     } finally {
       isAnalyzingRef.current = false;
     }
   }, [speak, sosPattern, playHapticMessage, playHazardSound]);
 
   const toggleAutoCapture = () => {
     if (isAutoCapturing) {
       setIsAutoCapturing(false);
       setAnalysisState("idle");
       setCaptionText("");
       setPriority(0);
       setShowWarning(false);
       stop();
       stopHaptic();
     } else {
       setIsAutoCapturing(true);
     }
   };
 
   const getStatusText = () => {
     if (analysisState === "analyzing") return "Processing visual context...";
     if (analysisState === "warning") return "Hazard identified - voice alert active";
     if (analysisState === "success") return "Analysis complete";
     if (analysisState === "error") return "Error - check settings";
     if (isAutoCapturing) return "Live scanning active";
     return "Tap Start to begin live scanning";
   };

   return (
    <div className="min-h-screen bg-background flex flex-col">
       {/* Live Camera Background */}
       <LiveCamera
         onCapture={handleCapture}
         isAutoCapturing={isAutoCapturing}
         isAnalyzing={analysisState === "analyzing"}
         priority={priority}
       />
 
       {/* Warning Banner */}
       <WarningBanner isVisible={showWarning} />
 
       {/* Dynamic Island - elevated above camera */}
       <div className={`flex justify-center pt-4 pb-6 relative z-10 ${showWarning ? "mt-16" : ""}`}>
         <DynamicIsland status={analysisState} priority={priority} />
       </div>

       {/* Status Text Overlay */}
       <div className="flex-1 flex items-end justify-center px-4 pb-52 relative z-10">
        <div className="w-full max-w-sm">
           <div className="text-center glass-panel super-ellipse-sm p-4">
             <h1 className="text-xl font-semibold tracking-tighter text-foreground drop-shadow-lg">
              NeuroNarrator
            </h1>
             <p className="text-sm text-muted-foreground mt-1 tracking-tight drop-shadow-lg">
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
         isActive={isAutoCapturing}
         onToggle={toggleAutoCapture}
         onSettingsClick={() => setSettingsOpen(true)}
         onAnalyze={() => {}}
         hasImage={true}
         isAnalyzing={analysisState === "analyzing"}
       />
 
       {/* Settings Modal */}
       <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
     </div>
  );
};

export default Index;
