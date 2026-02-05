 import { Settings, History, Play, Square } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { motion } from "framer-motion";
 
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
     <motion.div 
       className="fixed bottom-0 left-0 right-0 p-6 pb-8 z-20"
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.4 }}
     >
       <div className="glass-panel super-ellipse-sm p-4">
         <div className="flex items-center justify-between">
           {/* Settings Button */}
           <button
             onClick={onSettingsClick}
             className="tactile-button w-14 h-14 rounded-full flex items-center justify-center border border-glass-border bg-surface/50 hover:bg-surface transition-all duration-300"
           >
             <Settings className="w-6 h-6 text-muted-foreground" />
           </button>
 
           {/* Main Start/Stop Toggle Button */}
           <motion.button
             onClick={onToggle}
             className={cn(
               "tactile-button relative w-20 h-20 rounded-full flex items-center justify-center group"
             )}
             whileTap={{ scale: 0.95 }}
             transition={{ type: "spring", stiffness: 400, damping: 25 }}
           >
             {/* Outer ring - stable, no flicker */}
             <motion.div
               className={cn(
                 "absolute inset-0 rounded-full border-2",
                 isActive ? "border-ios-red" : "border-foreground/30"
               )}
               animate={{ 
                 scale: isActive ? [1, 1.05, 1] : 1,
                 opacity: isActive ? [0.7, 1, 0.7] : 1
               }}
               transition={{ 
                 duration: 2,
                 repeat: isActive ? Infinity : 0,
                 ease: "easeInOut"
               }}
             />
             
             {/* Middle ring - smooth color transition */}
             <motion.div
               className={cn(
                 "absolute inset-2 rounded-full border",
                 isActive ? "border-ios-red/50" : "border-foreground/20"
               )}
               animate={{ borderColor: isActive ? "hsl(var(--ios-red) / 0.5)" : "hsl(var(--foreground) / 0.2)" }}
               transition={{ duration: 0.5 }}
             />
             
             {/* Inner button */}
             <motion.div
               className={cn(
                 "absolute inset-3 rounded-full flex items-center justify-center",
                 isActive ? "bg-ios-red" : "bg-surface-elevated border border-glass-border"
               )}
               animate={{ 
                 backgroundColor: isActive ? "hsl(var(--ios-red))" : "hsl(var(--surface-elevated))",
                 boxShadow: isActive ? "0 0 20px hsl(var(--ios-red) / 0.4)" : "none"
               }}
               transition={{ duration: 0.4, ease: "easeOut" }}
             >
               {/* Icon - stable, no flickering between states */}
               <motion.div
                 key={isActive ? "stop" : "play"}
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.8 }}
                 transition={{ duration: 0.2 }}
               >
                 {isActive ? (
                   <Square className="w-6 h-6 text-foreground fill-current" />
                 ) : (
                   <Play className="w-7 h-7 text-foreground fill-current ml-1" />
                 )}
               </motion.div>
             </motion.div>
           </motion.button>
 
           {/* History Button */}
           <button className="tactile-button w-14 h-14 rounded-full flex items-center justify-center border border-glass-border bg-surface/50 hover:bg-surface transition-all duration-300">
             <History className="w-6 h-6 text-muted-foreground" />
           </button>
         </div>
 
         {/* Bottom indicator */}
         <div className="flex justify-center mt-4">
           <div className="w-32 h-1 rounded-full bg-foreground/20" />
         </div>
       </div>
     </motion.div>
   );
 };