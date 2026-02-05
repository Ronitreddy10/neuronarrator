 import { useState, useCallback, useRef } from "react";
import { DynamicIsland } from "@/components/DynamicIsland";
import { Viewfinder } from "@/components/Viewfinder";
import { ControlDeck } from "@/components/ControlDeck";
 import { useNeuroVoice } from "@/hooks/useNeuroVoice";
 
 type SimulationState = "standby" | "analyzing" | "hazard";
 
 interface DetectedObject {
   label: string;
   position: { top: string; left: string; width: string; height: string };
 }

const Index = () => {
   const [simulationState, setSimulationState] = useState<SimulationState>("standby");
   const [detectedObject, setDetectedObject] = useState<DetectedObject | null>(null);
   const { speak, stop } = useNeuroVoice();
   const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
 
   const clearTimeouts = () => {
     timeoutsRef.current.forEach(clearTimeout);
     timeoutsRef.current = [];
   };
 
   const runSimulation = useCallback(() => {
     clearTimeouts();
     stop();
     setDetectedObject(null);
     setSimulationState("analyzing");
 
     const hazardTimeout = setTimeout(() => {
       setSimulationState("hazard");
       setDetectedObject({
         label: "Stairs",
         position: { top: "35%", left: "50%", width: "40%", height: "45%" },
       });
       speak("Caution. Stairs detected ahead. Please proceed slowly.", 10);
     }, 1500);
 
     timeoutsRef.current.push(hazardTimeout);
   }, [speak, stop]);
 
   const resetSimulation = useCallback(() => {
     clearTimeouts();
     stop();
     setSimulationState("standby");
     setDetectedObject(null);
   }, [stop]);

   const handleToggle = useCallback(() => {
     if (simulationState === "standby") {
       runSimulation();
     } else {
       resetSimulation();
     }
   }, [simulationState, runSimulation, resetSimulation]);
 
   const isActive = simulationState !== "standby";
 
   const getStatusText = () => {
     switch (simulationState) {
       case "analyzing":
         return "Processing visual context...";
       case "hazard":
         return "Hazard identified - voice alert active";
       default:
         return "Tap to begin environment analysis";
     }
   };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Dynamic Island */}
      <div className="flex justify-center pt-4 pb-6">
         <DynamicIsland status={simulationState} />
      </div>

      {/* Main Content - Viewfinder */}
      <div className="flex-1 flex items-start justify-center px-4 pb-40">
        <div className="w-full max-w-sm">
           <Viewfinder 
             isActive={isActive} 
             showHazard={simulationState === "hazard"}
             detectedObject={detectedObject ?? undefined}
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

      {/* Control Deck */}
       <ControlDeck isActive={isActive} onToggle={handleToggle} />
    </div>
  );
};

export default Index;
