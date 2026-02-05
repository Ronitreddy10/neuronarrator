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
  captureRequestId: number; // Increment this to trigger a new capture
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
    // Only capture if this is a new request and we're actively scanning
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
 
   const flipCamera = () => {
     setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
   };
 
   const videoConstraints = {
    // Some browsers (notably iOS Safari) require a remount + ideal/exact facingMode shape
    facingMode: { ideal: facingMode },
     width: { ideal: 1920 },
     height: { ideal: 1080 },
   };
 
   return (
     <div className="fixed inset-0 z-0">
       {/* Full-screen webcam */}
       <Webcam
        key={facingMode}
         ref={webcamRef}
         audio={false}
         screenshotFormat="image/jpeg"
         videoConstraints={videoConstraints}
        onUserMediaError={(err) => console.error("Camera error:", err)}
         className="absolute inset-0 w-full h-full object-cover"
       />
 
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
          className="absolute top-4 left-4 z-10 w-12 h-12 rounded-full bg-surface/80 backdrop-blur-xl border border-glass-border flex items-center justify-center tactile-button"
         aria-label="Switch camera"
       >
         <SwitchCamera className="w-6 h-6 text-foreground" />
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