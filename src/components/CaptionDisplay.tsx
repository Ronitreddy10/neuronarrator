 interface CaptionDisplayProps {
   text: string;
  textContent?: string;
   isVisible: boolean;
   priority?: number;
  mode?: "general" | "reader";
 }
 
export const CaptionDisplay = ({ text, textContent, isVisible, priority = 0, mode = "general" }: CaptionDisplayProps) => {
   if (!isVisible || !text) return null;
 
  // In reader mode, show text_content prominently if available
  const displayText = mode === "reader" && textContent ? textContent : text;
  const hasTranscribedText = mode === "reader" && textContent && textContent.length > 0;

   return (
    <div className="fixed bottom-36 left-4 right-4 z-30 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 max-h-48 overflow-y-auto border border-white/10">
        {hasTranscribedText && (
          <div className="mb-2 pb-2 border-b border-white/10">
            <span className="text-xs text-ios-blue font-medium uppercase tracking-wider">
              Transcribed Text
            </span>
          </div>
        )}
        <div className="space-y-2">
          <p
            className={`text-lg font-medium leading-relaxed whitespace-pre-wrap ${
              priority > 7 ? "text-ios-red" : "text-white"
            }`}
          >
            {displayText}
          </p>
          {hasTranscribedText && text && text !== textContent && (
            <p className="text-sm text-white/60 leading-relaxed">
              {text}
            </p>
          )}
        </div>
       </div>
     </div>
   );
 };