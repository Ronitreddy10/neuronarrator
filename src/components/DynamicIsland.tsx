 import { cn } from "@/lib/utils";
 
 interface DynamicIslandProps {
   status: "idle" | "analyzing" | "success" | "warning" | "error";
   priority?: number;
 }
 
 export const DynamicIsland = ({ status, priority = 0 }: DynamicIslandProps) => {
   const isHighPriority = priority > 7;
 
   const getStatusDotClass = () => {
     switch (status) {
       case "warning":
         return "bg-ios-red status-analyzing";
       case "error":
         return "bg-ios-red";
       case "analyzing":
         return "bg-ios-blue status-analyzing";
       case "success":
         return isHighPriority ? "bg-ios-red status-analyzing" : "bg-ios-blue";
       default:
         return "bg-ios-green";
     }
   };
 
   const getStatusTextClass = () => {
     switch (status) {
       case "warning":
       case "error":
         return "text-ios-red";
       case "analyzing":
         return "text-ios-blue";
       case "success":
         return isHighPriority ? "text-ios-red" : "text-ios-blue";
       default:
         return "text-muted-foreground";
     }
   };
 
   const getStatusText = () => {
     switch (status) {
       case "warning":
         return "⚠ Hazard Detected";
       case "error":
         return "⚠ System Error";
       case "analyzing":
         return "Analyzing Scene...";
       case "success":
         return isHighPriority ? "⚠ High Priority Alert" : "Analysis Complete";
       default:
         return "Ready to Analyze";
     }
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