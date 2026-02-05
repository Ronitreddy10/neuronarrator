 import { AnimatePresence, motion } from "framer-motion";
 import { useState, useEffect } from "react";
 
 interface CaptionDisplayProps {
   text: string;
  textContent?: string;
   isVisible: boolean;
   priority?: number;
  mode?: "general" | "reader";
 }
 
 export const CaptionDisplay = ({ text, textContent, isVisible, priority = 0, mode = "general" }: CaptionDisplayProps) => {
   // Track displayed text separately to enable smooth transitions
   const [displayedText, setDisplayedText] = useState(text);
   const [displayedContent, setDisplayedContent] = useState(textContent);
   const [isTransitioning, setIsTransitioning] = useState(false);
 
   useEffect(() => {
     if (text !== displayedText) {
       setIsTransitioning(true);
       const timer = setTimeout(() => {
         setDisplayedText(text);
         setIsTransitioning(false);
       }, 150);
       return () => clearTimeout(timer);
     }
   }, [text, displayedText]);
 
   useEffect(() => {
     if (textContent !== displayedContent) {
       setDisplayedContent(textContent);
     }
   }, [textContent, displayedContent]);
 
   const hasTranscribedText = displayedContent && displayedContent.length > 0;
   const hasDescription = displayedText && displayedText.length > 0;
 
   return (
     <AnimatePresence>
       {isVisible && (hasDescription || hasTranscribedText) && (
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: 20 }}
           transition={{ duration: 0.3, ease: "easeOut" }}
           className="fixed bottom-36 left-4 right-4 z-30"
         >
           <div className="bg-gradient-to-br from-black/85 to-black/75 backdrop-blur-2xl rounded-3xl p-5 max-h-52 overflow-y-auto border border-white/15 shadow-2xl">
             <div className="space-y-3">
               {/* Scene description with smooth text transition */}
               {hasDescription && (
                 <motion.div
                   key={displayedText}
                   initial={{ opacity: 0.4 }}
                   animate={{ opacity: isTransitioning ? 0.4 : 1 }}
                   transition={{ duration: 0.25 }}
                 >
                   <p
                     className={`text-lg font-medium leading-relaxed tracking-tight ${
                       priority > 7 
                         ? "text-ios-red drop-shadow-[0_0_8px_hsl(var(--ios-red)/0.5)]" 
                         : "text-white/95"
                     }`}
                   >
                     {displayedText}
                   </p>
                 </motion.div>
               )}
               
               {/* Transcribed text section */}
               {hasTranscribedText && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ duration: 0.3, delay: 0.1 }}
                   className="mt-3 pt-3 border-t border-white/15"
                 >
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-ios-blue animate-pulse" />
                     <span className="text-xs text-ios-blue font-semibold uppercase tracking-widest">
                       Text Found
                     </span>
                   </div>
                   <p className="text-base text-white/85 leading-relaxed whitespace-pre-wrap font-light">
                     {displayedContent}
                   </p>
                 </motion.div>
               )}
             </div>
           </div>
         </motion.div>
       )}
     </AnimatePresence>
   );
 };