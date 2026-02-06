import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";

interface CaptionDisplayProps {
  text: string;
  textContent?: string;
  isVisible: boolean;
  priority?: number;
  mode?: "general" | "reader";
}

// Safety: if the AI returns raw JSON instead of a clean description, extract it
function sanitizeCaption(raw: string): string {
  if (!raw) return "";
  // If it looks like JSON, try to extract the description field
  if (raw.trim().startsWith("{") || raw.includes('"description"')) {
    try {
      const cleaned = raw.replace(/<\|[^|]*\|>/g, "").replace(/\bassistant\b/g, "");
      const match = cleaned.match(/"description"\s*:\s*"([^"]+)"/);
      if (match) return match[1];
    } catch {}
    // Strip JSON artifacts as fallback
    return raw
      .replace(/[{}":\[\]]/g, "")
      .replace(/text_content|description|hazards|priority|\d+/g, "")
      .replace(/<\|[^|]*\|>/g, "")
      .replace(/\bassistant\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  return raw;
}

export const CaptionDisplay = ({ text, textContent, isVisible, priority = 0, mode = "general" }: CaptionDisplayProps) => {
  const contentKeyRef = useRef(0);
  const prevTextRef = useRef(text);

  const cleanText = sanitizeCaption(text);

  if (cleanText !== prevTextRef.current && cleanText) {
    contentKeyRef.current += 1;
    prevTextRef.current = cleanText;
  }

  const hasTranscribedText = textContent && textContent.length > 0;
  const hasDescription = cleanText && cleanText.length > 0;
 
   return (
     <AnimatePresence>
       {isVisible && (hasDescription || hasTranscribedText) && (
         <motion.div
           initial={{ opacity: 0, y: 16 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: 16 }}
           transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
           className="fixed bottom-44 left-4 right-4 z-30"
         >
           <motion.div 
             className="bg-gradient-to-br from-black/90 to-black/80 backdrop-blur-2xl rounded-3xl p-5 max-h-52 overflow-y-auto border border-white/10 shadow-2xl"
             layout
             transition={{ duration: 0.3 }}
           >
             <div className="space-y-3">
               {/* Scene description with seamless crossfade */}
               {hasDescription && (
                 <AnimatePresence mode="wait">
                   <motion.p
                     key={contentKeyRef.current}
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     transition={{ duration: 0.4, ease: "easeInOut" }}
                     className={`text-lg font-medium leading-relaxed tracking-tight ${
                       priority > 7 
                         ? "text-ios-red drop-shadow-[0_0_8px_hsl(var(--ios-red)/0.5)]" 
                         : "text-white/95"
                     }`}
                    >
                      {cleanText}
                    </motion.p>
                 </AnimatePresence>
               )}
               
               {/* Transcribed text section */}
               {hasTranscribedText && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ duration: 0.4, delay: 0.15 }}
                   className="mt-3 pt-3 border-t border-white/15"
                 >
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-ios-blue animate-pulse" />
                     <span className="text-xs text-ios-blue font-semibold uppercase tracking-widest">
                       Text Found
                     </span>
                   </div>
                   <AnimatePresence mode="wait">
                     <motion.p 
                       key={textContent}
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       transition={{ duration: 0.35 }}
                       className="text-base text-white/85 leading-relaxed whitespace-pre-wrap font-light"
                     >
                       {textContent}
                     </motion.p>
                   </AnimatePresence>
                 </motion.div>
               )}
             </div>
           </motion.div>
         </motion.div>
       )}
     </AnimatePresence>
   );
 };