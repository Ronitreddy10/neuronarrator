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
import { useVoiceCommand } from "@/hooks/useVoiceCommand";
import { HapticBrailleIndicator } from "@/components/HapticBrailleIndicator";
import { analyzeImage as analyzeImageService, VisionMode, type KnownFaceInfo } from "@/services/vision";

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
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const isAnalyzingRef = useRef(false);
  const isActiveRef = useRef(false);
  const speechStartedAtRef = useRef<number>(0);
  const watchdogTimerRef = useRef<number | null>(null);
  const cameraRef = useRef<LiveCameraRef>(null);
  const lastDescriptionRef = useRef<string>("");
  const captureCountRef = useRef(0);

  const { speak, stop, isSpeaking } = useNeuroVoice();
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

  // Load face recognition models lazily — don't block app startup on mobile
  const modelsLoadedOnce = useRef(false);
  useEffect(() => {
    if (isAutoCapturing && !modelsLoadedOnce.current) {
      modelsLoadedOnce.current = true;
      loadModels();
    }
  }, [isAutoCapturing, loadModels]);

  // Voice command handler — truly hands-free: runs face detection RIGHT NOW
  const handleVoiceRemember = useCallback(async (name: string) => {
    const video = cameraRef.current?.getVideoElement();
    if (!video || video.readyState < 2 || !isModelsLoaded) {
      speak("I can't see anyone right now. Make sure the camera is on.", 5, {});
      return;
    }

    // Run face detection IMMEDIATELY — don't rely on stale state
    const match = await detectAndMatch(video);
    
    if (!match || match.known) {
      // Either no face detected or already known
      if (match?.known) {
        speak(`I already know ${match.name}. No need to save again.`, 5, {});
      } else {
        speak("I don't see a face right now. Try facing the camera.", 5, {});
      }
      return;
    }

    // We have an unknown face — register it
    const success = await registerCurrentFace(name, "Friend");
    if (success) {
      speak(`Got it, I'll remember ${name}.`, 5, {});
    } else {
      speak(`Couldn't save that face. Try again.`, 5, {});
    }
  }, [isModelsLoaded, detectAndMatch, registerCurrentFace, speak]);

  const handleVoiceClear = useCallback(() => {
    clearAllFaces();
    speak("All faces cleared from memory.", 5, {});
  }, [clearAllFaces, speak]);

  // Always-on voice command listener (active when scanning)
  const { isListening: isVoiceListening, lastCommand } = useVoiceCommand({
    onRememberCommand: handleVoiceRemember,
    onClearCommand: handleVoiceClear,
    enabled: isAutoCapturing,
  });

  // Kick the next capture — sole trigger for the speech→capture loop
  const triggerNextCapture = useCallback(() => {
    speechStartedAtRef.current = 0;
    if (isActiveRef.current && !isSpeaking()) {
      setTimeout(() => {
        if (isActiveRef.current && !isAnalyzingRef.current) {
          setCaptureRequestId(prev => prev + 1);
        }
      }, 300);
    }
  }, [isSpeaking]);

  // Called when speech finishes — triggers next capture
  const onSpeechEnd = useCallback(() => {
    triggerNextCapture();
  }, [triggerNextCapture]);

  // Watchdog: if nothing has happened for 8s, force a new capture
  // This catches ALL failure modes: TTS silent fail, network timeout, etc.
  useEffect(() => {
    if (!isAutoCapturing) {
      if (watchdogTimerRef.current) {
        window.clearInterval(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      return;
    }

    watchdogTimerRef.current = window.setInterval(() => {
      if (isActiveRef.current && !isAnalyzingRef.current && !isSpeaking()) {
        console.log("Watchdog: forcing next capture (loop may have stalled)");
        setCaptureRequestId(prev => prev + 1);
      } else if (isActiveRef.current && isSpeaking() && speechStartedAtRef.current > 0) {
        // If speech has been going on for more than 12s, something is stuck — force next
        const elapsed = Date.now() - speechStartedAtRef.current;
        if (elapsed > 12000) {
          console.warn("Watchdog: speech stuck for 12s+, forcing stop & next capture");
          stop();
          speechStartedAtRef.current = 0;
          setCaptureRequestId(prev => prev + 1);
        }
      }
    }, 8000);

    return () => {
      if (watchdogTimerRef.current) {
        window.clearInterval(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [isAutoCapturing, isSpeaking, stop]);

  const handleCapture = useCallback(async (base64: string): Promise<void> => {
    // Prevent concurrent requests
    if (isAnalyzingRef.current) return;
    // Smooth transition: if TTS is still speaking, skip this frame.
    // The current speech's onEnd will trigger the next capture naturally.
    if (isSpeaking()) return;
    isAnalyzingRef.current = true;
    captureCountRef.current += 1;
    const thisCaptureNum = captureCountRef.current;

    setAnalysisState("analyzing");

    try {
      // Step 1: Face detection with 2s timeout — skip gracefully on slow devices
      let knownFaces: KnownFaceInfo[] = [];
      if (isModelsLoaded) {
        const video = cameraRef.current?.getVideoElement();
        if (video && video.readyState >= 2) {
          try {
            const faceTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
            const match = await Promise.race([detectAndMatch(video), faceTimeout]);
            if (match && match.known && match.context) {
              knownFaces = [{
                name: match.context.name,
                relation: match.context.relation,
              }];
            }
          } catch (faceErr) {
            console.warn("Face detection skipped:", faceErr);
          }
        }
      }

      // Step 2: Send image + face names + previous description to vision API
      const result = await analyzeImageService(base64, mode, knownFaces, lastDescriptionRef.current);

      setPriority(result.priority);
      setCaptionText(result.description);
      setTextContent(result.text_content);
      lastDescriptionRef.current = result.description;

      // The AI description now includes face names naturally — no separate announcements needed
      const speechText = mode === "reader" 
        ? result.text_content || result.description
        : result.description;

      // Handle high priority hazards
      if (result.priority > 7) {
        setAnalysisState("warning");
        setShowWarning(true);
        sosPattern();
        playHazardSound(result.priority);
        speechStartedAtRef.current = Date.now();
        speak(`Warning! ${result.description}`, 10, { onEnd: onSpeechEnd });
        const hazardWord = result.description.split(" ").slice(0, 2).join(" ");
        playHapticMessage(hazardWord);
      } else {
        setAnalysisState("success");
        setShowWarning(false);
        playHazardSound(result.priority);
        speechStartedAtRef.current = Date.now();
        speak(speechText, 5, { onEnd: onSpeechEnd });
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysisState("error");
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setCaptionText(errorMsg);
      setTextContent("");
      // Use onEnd so the loop restarts naturally even after errors
      speak("Hmm, something went wrong. Retrying.", 5, { onEnd: onSpeechEnd });
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [speak, sosPattern, playHapticMessage, playHazardSound, mode, onSpeechEnd, triggerNextCapture, isModelsLoaded, detectAndMatch, isSpeaking]);

  const toggleAutoCapture = () => {
    if (isAutoCapturing) {
      setIsAutoCapturing(false);
      isActiveRef.current = false;
      captureCountRef.current = 0;
      speechStartedAtRef.current = 0;
      setAnalysisState("idle");
      setCaptionText("");
      setTextContent("");
      setPriority(0);
      setShowWarning(false);
      stop();
      stopHaptic();
    } else {
      // Enable camera and start scanning
      setCameraEnabled(true);
      setIsAutoCapturing(true);
      isActiveRef.current = true;
      
      // Unlock audio for TTS (non-blocking)
      unlockAudioForMobile();
      
      // Trigger first capture after camera initializes (1.5s)
      setTimeout(() => {
        if (isActiveRef.current) {
          setCaptureRequestId(1);
        }
      }, 1500);
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
        cameraEnabled={cameraEnabled}
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
        isVoiceListening={isVoiceListening}
        lastVoiceCommand={lastCommand}
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

      {/* Add Person Modal (still available for manual use / relationship customization) */}
      <AddPersonModal
        isOpen={addPersonOpen}
        onClose={() => setAddPersonOpen(false)}
        onSave={handleRegisterFace}
      />
    </div>
  );
};

export default Index;