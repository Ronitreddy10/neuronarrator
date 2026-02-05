import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import Webcam from "react-webcam";
import { SwitchCamera, Loader2, Camera } from "lucide-react";
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
  const [cameraKey, setCameraKey] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCapturingRef = useRef(false);
  const lastCaptureRequestIdRef = useRef(0);

  useImperativeHandle(ref, () => ({
    getVideoElement: () => webcamRef.current?.video ?? null,
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
 
  // Legacy interval mode
  useEffect(() => {
    if (!isAutoCapturing || smartLoopEnabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    if (isAnalyzing || isCapturingRef.current) return;
    captureFrame();
    intervalRef.current = setInterval(() => {
      if (!isAnalyzing && !isCapturingRef.current) captureFrame();
    }, 3500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAutoCapturing, isAnalyzing, captureFrame, smartLoopEnabled]);

  // Smart loop
  useEffect(() => {
    if (
      isAutoCapturing && smartLoopEnabled &&
      captureRequestId > lastCaptureRequestIdRef.current &&
      !isCapturingRef.current
    ) {
      lastCaptureRequestIdRef.current = captureRequestId;
      captureFrame();
    }
  }, [isAutoCapturing, smartLoopEnabled, captureRequestId, captureFrame]);

  useEffect(() => {
    if (!isAutoCapturing) lastCaptureRequestIdRef.current = 0;
  }, [isAutoCapturing]);
 
  const flipCamera = useCallback(async () => {
    if (isFlipping) return;
    setIsFlipping(true);
    const video = webcamRef.current?.video;
    if (video && video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setFacingMode(prev => prev === "user" ? "environment" : "user");
    setCameraKey(prev => prev + 1);
    setCameraError(null);
    setTimeout(() => setIsFlipping(false), 500);
  }, [isFlipping]);

  const handleCameraError = useCallback((err: string | DOMException) => {
    console.error("Camera error:", err);
    const msg = typeof err === "string" ? err : err.message;
    if (msg.includes("NotAllowed") || msg.includes("Permission denied")) {
      setCameraError("Camera access denied. Go to Settings → Safari → Camera and allow this site.");
    } else if (msg.includes("NotFound") || msg.includes("Requested device not found")) {
      setCameraError("No camera found on this device.");
    } else {
      setCameraError(`Camera error: ${msg}`);
    }
  }, []);
 
  const videoConstraints = {
    facingMode,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
 
  return (
    <div className="fixed inset-0 z-0">
      {/* Always mount webcam — iOS needs it in the initial render tree */}
      <Webcam
        key={`camera-${cameraKey}-${facingMode}`}
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        playsInline
        onUserMedia={() => setCameraError(null)}
        onUserMediaError={handleCameraError}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Camera error overlay */}
      <AnimatePresence>
        {cameraError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10 px-8"
          >
            <Camera className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-foreground text-center text-sm font-medium mb-2">Camera Unavailable</p>
            <p className="text-muted-foreground text-center text-xs leading-relaxed">{cameraError}</p>
            <button
              onClick={() => {
                setCameraError(null);
                setCameraKey(prev => prev + 1);
              }}
              className="mt-6 px-6 py-2 rounded-full bg-surface border border-glass-border text-foreground text-sm"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Red flash for hazards */}
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