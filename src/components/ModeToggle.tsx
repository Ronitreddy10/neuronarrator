 import { motion } from "framer-motion";
 
 type Mode = "general" | "reader";
 
 interface ModeToggleProps {
   mode: Mode;
   onModeChange: (mode: Mode) => void;
   disabled?: boolean;
 }
 
 export const ModeToggle = ({ mode, onModeChange, disabled }: ModeToggleProps) => {
   return (
     <div className="glass-panel super-ellipse-sm p-1 flex gap-1">
       <motion.button
         onClick={() => onModeChange("general")}
         disabled={disabled}
         className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
           mode === "general"
             ? "text-foreground"
             : "text-muted-foreground hover:text-foreground"
         } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
         whileTap={{ scale: 0.95 }}
       >
         {mode === "general" && (
           <motion.div
             layoutId="mode-indicator"
             className="absolute inset-0 bg-ios-surface-elevated rounded-xl"
             initial={false}
             transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
           />
         )}
         <span className="relative z-10">General</span>
       </motion.button>
       
       <motion.button
         onClick={() => onModeChange("reader")}
         disabled={disabled}
         className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
           mode === "reader"
             ? "text-foreground"
             : "text-muted-foreground hover:text-foreground"
         } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
         whileTap={{ scale: 0.95 }}
       >
         {mode === "reader" && (
           <motion.div
             layoutId="mode-indicator"
             className="absolute inset-0 bg-ios-surface-elevated rounded-xl"
             initial={false}
             transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
           />
         )}
         <span className="relative z-10">Reader</span>
       </motion.button>
     </div>
   );
 };