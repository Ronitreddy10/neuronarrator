import { useState, useCallback, useRef, useEffect } from "react";
import { DynamicIsland } from "@/components/DynamicIsland";
import { LiveCamera, type LiveCameraRef } from "@/components/LiveCamera";
import { ControlDeck } from "@/components/ControlDeck";
import { SettingsModal } from "@/components/SettingsModal";
import { type RelationType } from "@/lib/faceDatabase";
import { WarningBanner } from "@/components/WarningBanner";
import { CaptionDisplay } from "@/components/CaptionDisplay";
import { ModeToggle } from "@/components/ModeToggle";
import { AddPersonModal } from "@/components/AddPersonModal";
import { FaceRecognitionOverlay } from "@/components/FaceRecognitionOverlay";
import { useNeuroVoice, unlockAudioForMobile } from "@/hooks/useNeuroVoice";
import { useHaptics } from "@/hooks/useHaptics";
import { useHapticBraille } from "@/hooks/useHapticBraille";
import { useHazardSound } from "@/hooks/useHazardSound";
import { useFaceRecognition } from "@/hooks/useFaceRecognition";
import { HapticBrailleIndicator } from "@/components/HapticBrailleIndicator";
import { analyzeImage as analyzeImageService, VisionMode } from "@/services/vision";

type AnalysisState = "idle" | "analyzing" | "success" | "warning" | "error";

const Index = () => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [textContent, setTextContent] = useState("");
  const [priority, setPriority] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [mode, setMode] = useState<VisionMode>("general");
  const [captureRequestId, setCaptureRequestId] = useState(0);
  const isAnalyzingRef = useRef(false);
  const isActiveRef = useRef(false);
  const loopFallbackTimerRef = useRef<number | null>(null);
  const faceRecognitionIntervalRef = useRef<number | null>(null);
  const cameraRef = useRef<LiveCameraRef>(null);

  const { speak, stop } = useNeuroVoice();
  const { sosPattern } = useHaptics();
  const { playHapticMessage, stopHaptic, isPlaying: isHapticPlaying, currentChar, currentDots } = useHapticBraille();
  const { playHazardSound } = useHazardSound();
  
  const {
    isModelsLoaded,
    isLoadingModels,
    modelLoadError,
    lastMatch,
    lastUnknownDescriptor,
    storedFacesCount,
    detectAndMatch,
    registerCurrentFace,
    loadModels,
    retryLoadModels,
    clearAllFaces,
    generateSpeechText
  } = useFaceRecognition();

  // Load face recognition models on mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Track last announced face to avoid repeating
  const lastAnnouncedFaceRef = useRef<string | null>(null);
  const lastAnnouncedTimeRef = useRef<number>(0);
  const FACE_ANNOUNCE_COOLDOWN = 10000; // 10 seconds before re-announcing same face

  // Face recognition loop (runs every 2s when scanning is active)
  useEffect(() => {
    if (!isAutoCapturing || !isModelsLoaded) {
      if (faceRecognitionIntervalRef.current) {
        window.clearInterval(faceRecognitionIntervalRef.current);
        faceRecognitionIntervalRef.current = null;
      }
      return;
    }

    const runFaceRecognition = async () => {
      const video = cameraRef.current?.getVideoElement();
      if (video && video.readyState >= 2) {
        const match = await detectAndMatch(video);
        
        if (match) {
          const now = Date.now();
          const faceKey = match.known ? match.name : 'unknown';
          const timeSinceLastAnnounce = now - lastAnnouncedTimeRef.current;
          
          // Only speak if it's a different face or cooldown has passed
          const shouldAnnounce = 
            faceKey !== lastAnnouncedFaceRef.current || 
            timeSinceLastAnnounce > FACE_ANNOUNCE_COOLDOWN;
          
          if (shouldAnnounce) {
            const speechText = generateSpeechText(match);
            if (speechText) {
              lastAnnouncedFaceRef.current = faceKey;
              lastAnnouncedTimeRef.current = now;
              speak(speechText, 3, {});
            }
          }
        }
      }
    };

    // Initial detection
    runFaceRecognition();

    // Run every 2 seconds (not 500ms) to avoid API spam
    faceRecognitionIntervalRef.current = window.setInterval(runFaceRecognition, 2000);

    return () => {
      if (faceRecognitionIntervalRef.current) {
        window.clearInterval(faceRecognitionIntervalRef.current);
        faceRecognitionIntervalRef.current = null;
      }
    };
  }, [isAutoCapturing, isModelsLoaded, detectAndMatch, speak, generateSpeechText]);

  // Trigger next capture in the smart loop
  const triggerNextCapture = useCallback(() => {
    if (loopFallbackTimerRef.current) {
      window.clearTimeout(loopFallbackTimerRef.current);
      loopFallbackTimerRef.current = null;
    }
    if (isActiveRef.current) {
      // Small delay then request next capture
      setTimeout(() => {
        if (isActiveRef.current) {
          setCaptureRequestId(prev => prev + 1);
        }
      }, 200);
    }
  }, []);

  const handleCapture = useCallback(async (base64: string): Promise<void> => {
    // Prevent concurrent requests
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;

    setAnalysisState("analyzing");

    try {
      const result = await analyzeImageService(base64, mode);

      setPriority(result.priority);
      setCaptionText(result.description);
      setTextContent(result.text_content);

      // Determine what to speak based on mode
      const speechText = mode === "reader" 
        ? result.text_content || result.description
        : result.description;

      // Handle high priority hazards
      if (result.priority > 7) {
        setAnalysisState("warning");
        setShowWarning(true);
        sosPattern();
        playHazardSound(result.priority);
        speak(`Warning! ${result.description}`, 10, { onEnd: triggerNextCapture });
        // Fallback in case Web Speech API never fires onend on some devices
        loopFallbackTimerRef.current = window.setTimeout(triggerNextCapture, 8000);
        // Extract hazard keyword and play Braille haptic
        const hazardWord = result.description.split(" ").slice(0, 2).join(" ");
        playHapticMessage(hazardWord);
      } else {
        setAnalysisState("success");
        setShowWarning(false);
        playHazardSound(result.priority);
        speak(speechText, 5, { onEnd: triggerNextCapture });
        loopFallbackTimerRef.current = window.setTimeout(triggerNextCapture, 8000);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysisState("error");
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      speak("System Error. " + errorMsg, 10, { onEnd: triggerNextCapture });
      loopFallbackTimerRef.current = window.setTimeout(triggerNextCapture, 8000);
      setCaptionText(errorMsg);
      setTextContent("");
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [speak, sosPattern, playHapticMessage, playHazardSound, mode, triggerNextCapture]);

  const toggleAutoCapture = async () => {
    if (isAutoCapturing) {
      setIsAutoCapturing(false);
      isActiveRef.current = false;
      if (loopFallbackTimerRef.current) {
        window.clearTimeout(loopFallbackTimerRef.current);
        loopFallbackTimerRef.current = null;
      }
      setAnalysisState("idle");
      setCaptionText("");
      setTextContent("");
      setPriority(0);
      setShowWarning(false);
      stop();
      stopHaptic();
    } else {
      // CRITICAL: Unlock audio on iOS/Safari before starting
      // This must happen in response to a user gesture (the tap)
      await unlockAudioForMobile();
      
      setIsAutoCapturing(true);
      isActiveRef.current = true;
      // Trigger first capture
      setCaptureRequestId(1);
    }
  };

  const handleRegisterFace = async (name: string, relation: RelationType): Promise<boolean> => {
    const success = await registerCurrentFace(name, relation);
    if (success) {
      speak(`Face saved as ${name}, your ${relation.toLowerCase()}`, 5, {});
    }
    return success;
  };

  const handleClearFaces = async () => {
    await clearAllFaces();
    speak("All faces cleared from memory", 5, {});
  };

  const getStatusText = () => {
    if (analysisState === "analyzing") return "Processing visual context...";
    if (analysisState === "warning") return "Hazard detected - alert active";
    if (analysisState === "success") return "Analysis complete";
    if (analysisState === "error") return "Error - check settings";
    if (isAutoCapturing) return mode === "reader" ? "Reading text..." : "Live scanning active";
    return mode === "reader" ? "Tap Start to read text" : "Tap Start to begin scanning";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Live Camera Background */}
      <LiveCamera
        ref={cameraRef}
        onCapture={handleCapture}
        isAutoCapturing={isAutoCapturing}
        isAnalyzing={analysisState === "analyzing"}
        priority={priority}
        smartLoopEnabled={true}
        captureRequestId={captureRequestId}
      />

      {/* Warning Banner */}
      <WarningBanner isVisible={showWarning} />

      {/* Face Recognition Overlay */}
      <FaceRecognitionOverlay
        isModelsLoaded={isModelsLoaded}
        isLoadingModels={isLoadingModels}
        modelLoadError={modelLoadError}
        lastMatch={lastMatch}
        hasUnknownFace={!!lastUnknownDescriptor}
        storedFacesCount={storedFacesCount}
        onAddPerson={() => setAddPersonOpen(true)}
        onClearFaces={handleClearFaces}
        onRetryModels={retryLoadModels}
        isVisible={isAutoCapturing || isLoadingModels || !!modelLoadError}
      />

      {/* Dynamic Island - elevated above camera */}
      <div className={`flex justify-center pt-4 pb-6 relative z-10 ${showWarning ? "mt-16" : ""}`}>
        <DynamicIsland status={analysisState} priority={priority} />
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center relative z-10 mb-4">
        <ModeToggle 
          mode={mode} 
          onModeChange={setMode}
          disabled={isAutoCapturing}
        />
      </div>

      {/* Status Text Overlay */}
      <div className="flex-1 flex items-end justify-center px-4 pb-56 relative z-10">
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
        textContent={textContent}
        isVisible={analysisState === "success" || analysisState === "warning" || analysisState === "error"}
        priority={priority}
        mode={mode}
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

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={addPersonOpen}
        onClose={() => setAddPersonOpen(false)}
        onSave={handleRegisterFace}
      />
    </div>
  );
};

export default Index;
