 import { cn } from "@/lib/utils";
 import demoImage from "@/assets/demo-office.jpg";
 
 interface ViewfinderProps {
   isActive: boolean;
   showHazard: boolean;
   detectedObject?: {
     label: string;
     position: { top: string; left: string; width: string; height: string };
   };
 }
 
 export const Viewfinder = ({ isActive, showHazard, detectedObject }: ViewfinderProps) => {
   const getBorderColor = () => {
     if (showHazard) return "bg-ios-red";
     if (isActive) return "bg-ios-blue";
     return "bg-foreground/20";
   };
 
   return (
     <div
       className={cn(
         "viewfinder relative w-full aspect-[3/4] transition-all duration-300",
         isActive && !showHazard && "viewfinder-active animate-border-pulse",
         showHazard && "viewfinder-hazard"
       )}
     >
       {/* Demo image background */}
       <div className="absolute inset-0">
         <img 
           src={demoImage} 
           alt="Environment view" 
           className="w-full h-full object-cover opacity-80"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/20" />
       </div>
       
       {/* Corner brackets for camera feel */}
       <div className="absolute inset-4 pointer-events-none">
         {/* Top Left */}
         <div className="absolute top-0 left-0 w-8 h-8">
           <div className={cn(
             "absolute top-0 left-0 w-full h-[2px] transition-colors duration-500",
             getBorderColor()
           )} />
           <div className={cn(
             "absolute top-0 left-0 w-[2px] h-full transition-colors duration-500",
             getBorderColor()
           )} />
         </div>
         
         {/* Top Right */}
         <div className="absolute top-0 right-0 w-8 h-8">
           <div className={cn(
             "absolute top-0 right-0 w-full h-[2px] transition-colors duration-500",
             getBorderColor()
           )} />
           <div className={cn(
             "absolute top-0 right-0 w-[2px] h-full transition-colors duration-500",
             getBorderColor()
           )} />
         </div>
         
         {/* Bottom Left */}
         <div className="absolute bottom-0 left-0 w-8 h-8">
           <div className={cn(
             "absolute bottom-0 left-0 w-full h-[2px] transition-colors duration-500",
             getBorderColor()
           )} />
           <div className={cn(
             "absolute bottom-0 left-0 w-[2px] h-full transition-colors duration-500",
             getBorderColor()
           )} />
         </div>
         
         {/* Bottom Right */}
         <div className="absolute bottom-0 right-0 w-8 h-8">
           <div className={cn(
             "absolute bottom-0 right-0 w-full h-[2px] transition-colors duration-500",
             getBorderColor()
           )} />
           <div className={cn(
             "absolute bottom-0 right-0 w-[2px] h-full transition-colors duration-500",
             getBorderColor()
           )} />
         </div>
       </div>
 
       {/* Center crosshair */}
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <div className="relative w-16 h-16">
           <div className={cn(
             "absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 transition-colors duration-500",
             showHazard ? "bg-ios-red/60" : isActive ? "bg-ios-blue/60" : "bg-foreground/10"
           )} />
           <div className={cn(
             "absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 transition-colors duration-500",
             showHazard ? "bg-ios-red/60" : isActive ? "bg-ios-blue/60" : "bg-foreground/10"
           )} />
         </div>
       </div>
 
       {/* Bounding box for detected object */}
       {detectedObject && (
         <div 
           className="bounding-box"
           style={{
             top: detectedObject.position.top,
             left: detectedObject.position.left,
             width: detectedObject.position.width,
             height: detectedObject.position.height,
           }}
         >
           <div className="bounding-box-label">
             {detectedObject.label}
           </div>
         </div>
       )}
 
       {/* Scanning line animation when active */}
       {isActive && !showHazard && (
         <div className="absolute inset-x-0 top-0 h-full overflow-hidden pointer-events-none">
           <div 
             className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-ios-blue to-transparent opacity-60"
             style={{
               animation: "scanLine 2s ease-in-out infinite",
             }}
           />
         </div>
       )}
 
       <style>{`
         @keyframes scanLine {
           0% {
             top: 0%;
             opacity: 0;
           }
           10% {
             opacity: 0.6;
           }
           90% {
             opacity: 0.6;
           }
           100% {
             top: 100%;
             opacity: 0;
           }
         }
       `}</style>
     </div>
   );
 };