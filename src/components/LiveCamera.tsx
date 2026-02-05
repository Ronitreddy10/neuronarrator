 import { useRef, useState, useCallback, useEffect } from "react";
 import Webcam from "react-webcam";
 import { SwitchCamera } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface LiveCameraProps {
   onCapture: (base64: string) => void;
   isAutoCapturing: boolean;
   isAnalyzing: boolean;
   priority: number;
 }
 
 export const LiveCamera = ({
   onCapture,
   isAutoCapturing,
   isAnalyzing,
   priority,
 }: LiveCameraProps) => {
   const webcamRef = useRef<Webcam>(null);
   const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
   const intervalRef = useRef<NodeJS.Timeout | null>(null);
 
   const captureFrame = useCallback(() => {
     if (webcamRef.current && !isAnalyzing) {
       const screenshot = webcamRef.current.getScreenshot();
       if (screenshot) {
         onCapture(screenshot);
       }
     }
   }, [onCapture, isAnalyzing]);
 
   useEffect(() => {
     if (isAutoCapturing) {
       // Initial capture
       captureFrame();
 
       // Set up interval for every 3.5 seconds
       intervalRef.current = setInterval(() => {
         if (!isAnalyzing) {
           captureFrame();
         }
       }, 3500);
     } else {
       if (intervalRef.current) {
         clearInterval(intervalRef.current);
         intervalRef.current = null;
       }
     }
 
     return () => {
       if (intervalRef.current) {
         clearInterval(intervalRef.current);
         intervalRef.current = null;
       }
     };
   }, [isAutoCapturing, captureFrame, isAnalyzing]);
 
   const flipCamera = () => {
     setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
   };
 
   const videoConstraints = {
     facingMode,
     width: { ideal: 1920 },
     height: { ideal: 1080 },
   };
 
   return (
     <div className="fixed inset-0 z-0">
       {/* Full-screen webcam */}
       <Webcam
         ref={webcamRef}
         audio={false}
         screenshotFormat="image/jpeg"
         videoConstraints={videoConstraints}
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
         className="absolute top-20 right-4 z-10 w-12 h-12 rounded-full bg-surface/80 backdrop-blur-xl border border-glass-border flex items-center justify-center tactile-button"
         aria-label="Switch camera"
       >
         <SwitchCamera className="w-6 h-6 text-foreground" />
       </button>
 
       {/* Recording indicator */}
       {isAutoCapturing && (
         <div className="absolute top-20 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-full bg-surface/80 backdrop-blur-xl border border-glass-border">
           <div className="w-3 h-3 rounded-full bg-ios-red animate-pulse" />
           <span className="text-xs font-medium text-foreground">LIVE</span>
         </div>
       )}
     </div>
   );
 };