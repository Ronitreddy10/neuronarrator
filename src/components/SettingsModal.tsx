 import { useState, useEffect } from "react";
 import { X, Key, Eye, EyeOff, Check } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface SettingsModalProps {
   isOpen: boolean;
   onClose: () => void;
 }
 
 const API_KEY_STORAGE_KEY = "neuronarrator_gemini_api_key";
 const GROK_API_KEY_STORAGE_KEY = "neuronarrator_grok_api_key";
 
 export const getStoredApiKey = (): string => {
   return localStorage.getItem(GROK_API_KEY_STORAGE_KEY) || "";
 };
 
 export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
   const [apiKey, setApiKey] = useState("");
   const [showKey, setShowKey] = useState(false);
   const [saved, setSaved] = useState(false);
 
   useEffect(() => {
     if (isOpen) {
       setApiKey(getStoredApiKey());
       setSaved(false);
     }
   }, [isOpen]);
 
   const handleSave = () => {
     localStorage.setItem(GROK_API_KEY_STORAGE_KEY, apiKey.trim());
     setSaved(true);
     setTimeout(() => {
       onClose();
     }, 800);
   };
 
   const handleClear = () => {
     localStorage.removeItem(GROK_API_KEY_STORAGE_KEY);
     setApiKey("");
     setSaved(false);
   };
 
   if (!isOpen) return null;
 
   return (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
       {/* Backdrop */}
       <div
         className="absolute inset-0 bg-background/80 backdrop-blur-sm"
         onClick={onClose}
       />
 
       {/* Modal */}
       <div className="relative w-full max-w-sm glass-panel super-ellipse-sm p-6 animate-in fade-in zoom-in-95 duration-200">
         {/* Header */}
         <div className="flex items-center justify-between mb-6">
           <h2 className="text-lg font-semibold text-foreground">Settings</h2>
           <button
             onClick={onClose}
             className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center hover:bg-surface transition-colors"
           >
             <X className="w-4 h-4 text-muted-foreground" />
           </button>
         </div>
 
         {/* API Key Section */}
         <div className="space-y-4">
           <div className="flex items-center gap-2 text-muted-foreground">
             <Key className="w-4 h-4" />
             <span className="text-sm font-medium">Grok API Key</span>
           </div>
 
           <div className="relative">
             <input
               type={showKey ? "text" : "password"}
               value={apiKey}
               onChange={(e) => {
                 setApiKey(e.target.value);
                 setSaved(false);
               }}
               placeholder="xai-..."
               className="w-full h-12 px-4 pr-12 rounded-xl bg-surface-elevated border border-glass-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ios-blue transition-colors text-sm"
             />
             <button
               onClick={() => setShowKey(!showKey)}
               className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
             >
               {showKey ? (
                 <EyeOff className="w-5 h-5" />
               ) : (
                 <Eye className="w-5 h-5" />
               )}
             </button>
           </div>
 
           <p className="text-xs text-muted-foreground">
             Get your API key from{" "}
             <a
               href="https://console.x.ai"
               target="_blank"
               rel="noopener noreferrer"
               className="text-ios-blue hover:underline"
             >
               xAI Console
             </a>
           </p>
 
           {/* Actions */}
           <div className="flex gap-3 pt-2">
             <button
               onClick={handleClear}
               className="flex-1 h-11 rounded-xl border border-glass-border text-muted-foreground font-medium text-sm hover:bg-surface-elevated transition-colors"
             >
               Clear
             </button>
             <button
               onClick={handleSave}
               disabled={!apiKey.trim()}
               className={cn(
                 "flex-1 h-11 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2",
                 saved
                   ? "bg-ios-green text-foreground"
                   : apiKey.trim()
                   ? "bg-ios-blue text-foreground hover:opacity-90"
                   : "bg-surface-elevated text-muted-foreground cursor-not-allowed"
               )}
             >
               {saved ? (
                 <>
                   <Check className="w-4 h-4" />
                   Saved
                 </>
               ) : (
                 "Save Key"
               )}
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 };