 interface CaptionDisplayProps {
   text: string;
   isVisible: boolean;
   priority?: number;
 }
 
 export const CaptionDisplay = ({ text, isVisible, priority = 0 }: CaptionDisplayProps) => {
   if (!isVisible || !text) return null;
 
   return (
     <div className="fixed bottom-32 left-4 right-4 z-30 animate-in fade-in slide-in-from-bottom duration-300">
       <div className="glass-panel rounded-2xl p-4 max-h-32 overflow-y-auto">
         <p
           className={`text-lg font-medium leading-relaxed ${
             priority > 7 ? "text-ios-red" : "text-foreground"
           }`}
         >
           {text}
         </p>
       </div>
     </div>
   );
 };