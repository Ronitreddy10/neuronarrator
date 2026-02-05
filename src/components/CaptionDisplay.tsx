 interface CaptionDisplayProps {
   text: string;
  textContent?: string;
   isVisible: boolean;
   priority?: number;
  mode?: "general" | "reader";
 }
 
export const CaptionDisplay = ({ text, textContent, isVisible, priority = 0, mode = "general" }: CaptionDisplayProps) => {
  if (!isVisible || (!text && !textContent)) return null;
 
  const hasTranscribedText = textContent && textContent.length > 0;
  const hasDescription = text && text.length > 0;

   return (
    <div className="fixed bottom-36 left-4 right-4 z-30 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 max-h-48 overflow-y-auto border border-white/10">
        <div className="space-y-2">
          {/* Always show scene description first */}
          {hasDescription && (
            <p
              className={`text-lg font-medium leading-relaxed ${
                priority > 7 ? "text-ios-red" : "text-white"
              }`}
            >
              {text}
            </p>
          )}
          
          {/* Show transcribed text if available */}
          {hasTranscribedText && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <span className="text-xs text-ios-blue font-medium uppercase tracking-wider block mb-1">
                Text Found
              </span>
              <p className="text-base text-white/90 leading-relaxed whitespace-pre-wrap">
                {textContent}
              </p>
            </div>
          )}
        </div>
       </div>
     </div>
   );
 };