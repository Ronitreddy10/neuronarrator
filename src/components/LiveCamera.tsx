import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import Webcam from "react-webcam";
import { SwitchCamera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface LiveCameraProps {
  onCapture: (base64: string) => Promise<void>;
  isAutoCapturing: boolean;
  isAnalyzing: boolean;
  priority: number;
  smartLoopEnabled: boolean;
  captureRequestId: number;
}

export interface LiveCameraRef {
  getVideoElement: () => HTMLVideoElement | null;
}
 
export const LiveCamera = forwardRef<LiveCameraRef, LiveCameraProps>(({
  onCapture,
  isAutoCapturing,
  isAnalyzing,
  priority,
  smartLoopEnabled,
  captureRequestId,
}, ref) => {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraKey, setCameraKey] = useState(0); // Force remount on iOS
  const [isFlipping, setIsFlipping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCapturingRef = useRef(false);
  const lastCaptureRequestIdRef = useRef(0);

  // Expose video element to parent via ref
  useImperativeHandle(ref, () => ({
    getVideoElement: () => {
      return webcamRef.current?.video ?? null;
    }
  }), []);
 
  const captureFrame = useCallback(async () => {
    if (isCapturingRef.current) return;
    
    if (webcamRef.current) {
       const screenshot = webcamRef.current.getScreenshot();
       if (screenshot) {
        isCapturingRef.current = true;
        try {
          await onCapture(screenshot);
        } finally {
          isCapturingRef.current = false;
        }
       }
     }
  }, [onCapture]);
 
  // Legacy interval mode (when smart loop is disabled)
   useEffect(() => {
    if (!isAutoCapturing || smartLoopEnabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
     }
    
    if (isAnalyzing || isCapturingRef.current) return;
    
    // Initial capture
    captureFrame();
    
    intervalRef.current = setInterval(() => {
      if (!isAnalyzing && !isCapturingRef.current) {
        captureFrame();
      }
    }, 3500);
 
     return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
     };
  }, [isAutoCapturing, isAnalyzing, captureFrame, smartLoopEnabled]);

  // Smart loop: respond to capture requests from parent
  useEffect(() => {
    if (
      isAutoCapturing && 
      smartLoopEnabled && 
      captureRequestId > lastCaptureRequestIdRef.current &&
      !isCapturingRef.current
    ) {
      lastCaptureRequestIdRef.current = captureRequestId;
      captureFrame();
    }
  }, [isAutoCapturing, smartLoopEnabled, captureRequestId, captureFrame]);

  // Reset request ID when stopping
  useEffect(() => {
    if (!isAutoCapturing) {
      lastCaptureRequestIdRef.current = 0;
    }
  }, [isAutoCapturing]);
 
  // iOS-compatible camera flip - completely remount the component
  const flipCamera = useCallback(async () => {
    if (isFlipping) return;
    
    setIsFlipping(true);
    
    // Stop current stream if possible
    const video = webcamRef.current?.video;
    if (video && video.srcObject) {
      const tracks = (video.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    
    // Toggle facing mode and force remount
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    setCameraKey(prev => prev + 1);
    
    // Give time for remount
    setTimeout(() => {
      setIsFlipping(false);
    }, 500);
  }, [isFlipping]);
 
  const videoConstraints = {
    facingMode: facingMode,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  // Track if camera was ever started (persists after stopping so preview stays)
  const [cameraStarted, setCameraStarted] = useState(false);

  useEffect(() => {
    if (isAutoCapturing && !cameraStarted) {
      setCameraStarted(true);
    }
  }, [isAutoCapturing, cameraStarted]);

  const shouldMountCamera = cameraStarted;
 
  return (
    <div className="fixed inset-0 z-0">
      {/* Full-screen webcam - only mount after user gesture for iOS Safari */}
      {shouldMountCamera ? (
        <Webcam
          key={`camera-${cameraKey}-${facingMode}`}
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          playsInline
          onUserMediaError={(err) => console.error("Camera error:", err)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Tap Start to activate camera</p>
        </div>
      )}

      {/* Flip transition overlay */}
      <AnimatePresence>
        {isFlipping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
          >
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Red flash overlay for high priority hazards */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-100",
          priority >= 9 ? "bg-ios-red/30 animate-pulse" : "opacity-0"
        )}
      />

      {/* Camera flip button */}
      <button
        onClick={flipCamera}
        disabled={isFlipping}
        className={cn(
          "absolute top-4 left-4 z-10 w-12 h-12 rounded-full bg-surface/80 backdrop-blur-xl border border-glass-border flex items-center justify-center tactile-button",
          isFlipping && "opacity-50"
        )}
        aria-label="Switch camera"
      >
        <SwitchCamera className={cn("w-6 h-6 text-foreground", isFlipping && "animate-spin")} />
      </button>
 
        {/* Analyzing indicator */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 z-10 px-3 py-2 rounded-full bg-surface/80 backdrop-blur-xl border border-glass-border flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 text-ios-blue animate-spin" />
              <span className="text-xs font-medium text-muted-foreground">Reading...</span>
            </motion.div>
          )}
        </AnimatePresence>

       {/* Recording indicator */}
        <AnimatePresence>
          {isAutoCapturing && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-surface/80 backdrop-blur-xl border border-glass-border"
            >
              <div className="w-3 h-3 rounded-full bg-ios-red animate-pulse" />
              <span className="text-xs font-medium text-foreground">LIVE</span>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
});

LiveCamera.displayName = "LiveCamera";