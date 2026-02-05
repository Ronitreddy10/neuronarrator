 import { motion, AnimatePresence } from "framer-motion";
 
 interface HapticBrailleIndicatorProps {
   isPlaying: boolean;
   currentChar: string | null;
   currentDots: number[];
 }
 
 /**
  * Visual Braille cell display showing active dots
  * Dot positions: 1 4
  *                2 5
  *                3 6
  */
 const BrailleCell = ({ dots }: { dots: number[] }) => {
   const dotPositions = [
     { dot: 1, row: 0, col: 0 },
     { dot: 2, row: 1, col: 0 },
     { dot: 3, row: 2, col: 0 },
     { dot: 4, row: 0, col: 1 },
     { dot: 5, row: 1, col: 1 },
     { dot: 6, row: 2, col: 1 },
   ];
 
   return (
     <div className="grid grid-cols-2 gap-1.5 p-2">
       {dotPositions.map(({ dot, row, col }) => {
         const isActive = dots.includes(dot);
         return (
           <motion.div
             key={dot}
             className={`w-3 h-3 rounded-full ${
               isActive ? "bg-primary" : "bg-muted"
             }`}
             style={{ gridRow: row + 1, gridColumn: col + 1 }}
             animate={
               isActive
                 ? {
                     scale: [1, 1.3, 1],
                     opacity: [1, 0.8, 1],
                   }
                 : { scale: 1, opacity: 0.3 }
             }
             transition={{
               duration: 0.15,
               repeat: isActive ? Infinity : 0,
               repeatDelay: 0.1,
             }}
           />
         );
       })}
     </div>
   );
 };
 
 /**
  * Waveform animation to indicate haptic feedback is active
  */
 const WaveformIndicator = () => {
   const bars = 5;
   return (
     <div className="flex items-center gap-0.5 h-6">
       {Array.from({ length: bars }).map((_, i) => (
         <motion.div
           key={i}
           className="w-1 bg-primary rounded-full"
           animate={{
             height: ["8px", "24px", "8px"],
           }}
           transition={{
             duration: 0.5,
             repeat: Infinity,
             delay: i * 0.1,
             ease: "easeInOut",
           }}
         />
       ))}
     </div>
   );
 };
 
 export const HapticBrailleIndicator = ({
   isPlaying,
   currentChar,
   currentDots,
 }: HapticBrailleIndicatorProps) => {
   return (
     <AnimatePresence>
       {isPlaying && (
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: 20 }}
           className="fixed bottom-44 left-1/2 -translate-x-1/2 z-50"
         >
           <div className="glass-panel super-ellipse-sm px-5 py-3 flex items-center gap-4">
             {/* Waveform */}
             <WaveformIndicator />
 
             {/* Braille Cell Visualization */}
             <div className="flex items-center gap-3">
               <BrailleCell dots={currentDots} />
               <div className="flex flex-col">
                 <span className="text-xs text-muted-foreground uppercase tracking-wider">
                   Haptic Braille
                 </span>
                 <span className="text-lg font-semibold text-foreground">
                   {currentChar || "—"}
                 </span>
               </div>
             </div>
 
             {/* Waveform (mirrored) */}
             <WaveformIndicator />
           </div>
         </motion.div>
       )}
     </AnimatePresence>
   );
 };