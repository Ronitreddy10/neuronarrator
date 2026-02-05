import { useState } from "react";
import { DynamicIsland } from "@/components/DynamicIsland";
import { Viewfinder } from "@/components/Viewfinder";
import { ControlDeck } from "@/components/ControlDeck";

const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleToggle = () => {
    setIsAnalyzing((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Dynamic Island */}
      <div className="flex justify-center pt-4 pb-6">
        <DynamicIsland status={isAnalyzing ? "analyzing" : "standby"} />
      </div>

      {/* Main Content - Viewfinder */}
      <div className="flex-1 flex items-start justify-center px-4 pb-40">
        <div className="w-full max-w-sm">
          <Viewfinder isActive={isAnalyzing} />
          
          {/* Status Text Below Viewfinder */}
          <div className="mt-6 text-center">
            <h1 className="text-xl font-semibold tracking-tighter text-foreground">
              NeuroNarrator
            </h1>
            <p className="text-sm text-muted-foreground mt-1 tracking-tight">
              {isAnalyzing 
                ? "Processing visual context..." 
                : "Tap to begin environment analysis"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Control Deck */}
      <ControlDeck isActive={isAnalyzing} onToggle={handleToggle} />
    </div>
  );
};

export default Index;
