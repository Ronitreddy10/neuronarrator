 import { cn } from "@/lib/utils";
 
 interface DynamicIslandProps {
   status: "standby" | "analyzing" | "hazard";
 }
 
 export const DynamicIsland = ({ status }: DynamicIslandProps) => {
   const isAnalyzing = status === "analyzing";
   const isHazard = status === "hazard";
 
   const getStatusDotClass = () => {
     if (isHazard) return "bg-ios-red status-analyzing";
     if (isAnalyzing) return "bg-ios-blue status-analyzing";
     return "bg-ios-green";
   };
 
   const getStatusTextClass = () => {
     if (isHazard) return "text-ios-red";
     if (isAnalyzing) return "text-ios-blue";
     return "text-muted-foreground";
   };
 
   const getStatusText = () => {
     if (isHazard) return "⚠ Hazard Detected";
     if (isAnalyzing) return "Analyzing Scene...";
     return "System Standby";
   };
 
   return (
     <div className="dynamic-island shadow-island">
       <div className="flex items-center gap-2">
         <div
           className={cn(
             "w-2 h-2 rounded-full transition-colors duration-300",
             getStatusDotClass()
           )}
         />
         <span
           className={cn(
             "text-xs font-medium tracking-tight transition-colors duration-300",
             getStatusTextClass()
           )}
         >
           {getStatusText()}
         </span>
       </div>
     </div>
   );
 };