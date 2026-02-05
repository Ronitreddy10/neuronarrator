 import { Settings, History, Play, Square, Loader2 } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface ControlDeckProps {
   isActive: boolean;
   onToggle: () => void;
   onSettingsClick: () => void;
   onAnalyze: () => void;
   hasImage: boolean;
   isAnalyzing: boolean;
 }
 
 export const ControlDeck = ({
   isActive,
   onToggle,
   onSettingsClick,
   onAnalyze,
   hasImage,
   isAnalyzing,
 }: ControlDeckProps) => {
   return (
     <div className="fixed bottom-0 left-0 right-0 p-6 pb-8 z-20">
       <div className="glass-panel super-ellipse-sm p-4">
         <div className="flex items-center justify-between">
           {/* Settings Button */}
           <button
             onClick={onSettingsClick}
             className="tactile-button w-14 h-14 rounded-full flex items-center justify-center border border-glass-border bg-surface/50 hover:bg-surface transition-colors duration-200"
           >
             <Settings className="w-6 h-6 text-muted-foreground" />
           </button>
 
           {/* Main Start/Stop Toggle Button */}
           <button
             onClick={onToggle}
             className={cn(
               "tactile-button relative w-20 h-20 rounded-full flex items-center justify-center group"
             )}
           >
             {/* Outer pulsing ring */}
             <div
               className={cn(
                 "absolute inset-0 rounded-full border-2 transition-colors duration-300",
                 isActive
                   ? "border-ios-red pulse-ring"
                   : "border-foreground/30"
               )}
             />
             
             {/* Middle ring */}
             <div
               className={cn(
                 "absolute inset-2 rounded-full border transition-colors duration-300",
                 isActive ? "border-ios-red/50" : "border-foreground/20"
               )}
             />
             
             {/* Inner button */}
             <div
               className={cn(
                 "absolute inset-3 rounded-full flex items-center justify-center transition-all duration-300",
                 isActive
                   ? "bg-ios-red shadow-glow-red"
                   : "bg-surface-elevated border border-glass-border"
               )}
             >
               {isActive ? (
                 isAnalyzing ? (
                   <Loader2 className="w-7 h-7 text-foreground animate-spin" />
                 ) : (
                   <Square className="w-6 h-6 text-foreground fill-current" />
                 )
               ) : (
                 <Play className="w-7 h-7 text-foreground fill-current ml-1" />
               )}
             </div>
           </button>
 
           {/* History Button */}
           <button className="tactile-button w-14 h-14 rounded-full flex items-center justify-center border border-glass-border bg-surface/50 hover:bg-surface transition-colors duration-200">
             <History className="w-6 h-6 text-muted-foreground" />
           </button>
         </div>
 
         {/* Bottom indicator */}
         <div className="flex justify-center mt-4">
           <div className="w-32 h-1 rounded-full bg-foreground/20" />
         </div>
       </div>
     </div>
   );
 };