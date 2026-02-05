 import { cn } from "@/lib/utils";
 
 interface DynamicIslandProps {
   status: "standby" | "analyzing";
 }
 
 export const DynamicIsland = ({ status }: DynamicIslandProps) => {
   const isAnalyzing = status === "analyzing";
 
   return (
     <div className="dynamic-island shadow-island">
       <div className="flex items-center gap-2">
         <div
           className={cn(
             "w-2 h-2 rounded-full transition-colors duration-300",
             isAnalyzing ? "bg-ios-blue status-analyzing" : "bg-ios-green"
           )}
         />
         <span
           className={cn(
             "text-xs font-medium tracking-tight transition-colors duration-300",
             isAnalyzing ? "text-ios-blue" : "text-muted-foreground"
           )}
         >
           {isAnalyzing ? "Analyzing Environment..." : "System Standby"}
         </span>
       </div>
     </div>
   );
 };