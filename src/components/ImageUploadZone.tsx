 import { useState, useCallback, useRef } from "react";
 import { Upload, Camera, Image, X } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface ImageUploadZoneProps {
   onImageSelect: (base64: string) => void;
   uploadedImage: string | null;
   onClear: () => void;
   analysisState: "idle" | "analyzing" | "success" | "warning" | "error";
   priority?: number;
 }
 
 export const ImageUploadZone = ({
   onImageSelect,
   uploadedImage,
   onClear,
   analysisState,
   priority = 0,
 }: ImageUploadZoneProps) => {
   const [isDragging, setIsDragging] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
   const getBorderClass = () => {
     if (analysisState === "warning" || priority > 7) return "border-ios-red animate-pulse";
     if (analysisState === "analyzing") return "border-ios-blue animate-pulse";
     if (analysisState === "success") return "border-ios-blue";
     if (isDragging) return "border-ios-blue";
     return "border-glass-border";
   };
 
   const convertToBase64 = (file: File): Promise<string> => {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = () => {
         const result = reader.result as string;
         // Extract base64 data after the comma
         const base64 = result.split(",")[1];
         resolve(base64);
       };
       reader.onerror = reject;
       reader.readAsDataURL(file);
     });
   };
 
   const handleFile = useCallback(
     async (file: File) => {
       if (!file.type.startsWith("image/")) return;
       const base64 = await convertToBase64(file);
       onImageSelect(base64);
     },
     [onImageSelect]
   );
 
   const handleDrop = useCallback(
     (e: React.DragEvent) => {
       e.preventDefault();
       setIsDragging(false);
       const file = e.dataTransfer.files[0];
       if (file) handleFile(file);
     },
     [handleFile]
   );
 
   const handleDragOver = (e: React.DragEvent) => {
     e.preventDefault();
     setIsDragging(true);
   };
 
   const handleDragLeave = () => {
     setIsDragging(false);
   };
 
   const handleClick = () => {
     fileInputRef.current?.click();
   };
 
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) handleFile(file);
   };
 
   return (
     <div
       className={cn(
         "relative w-full aspect-[3/4] rounded-3xl overflow-hidden transition-all duration-300 border-2",
         getBorderClass(),
         !uploadedImage && "cursor-pointer"
       )}
       onDrop={handleDrop}
       onDragOver={handleDragOver}
       onDragLeave={handleDragLeave}
       onClick={!uploadedImage ? handleClick : undefined}
     >
       <input
         ref={fileInputRef}
         type="file"
         accept="image/*"
         className="hidden"
         onChange={handleInputChange}
       />
 
       {uploadedImage ? (
         <>
           {/* Uploaded image */}
           <img
             src={`data:image/jpeg;base64,${uploadedImage}`}
             alt="Uploaded for analysis"
             className="w-full h-full object-cover"
           />
           
           {/* Clear button */}
           <button
             onClick={(e) => {
               e.stopPropagation();
               onClear();
             }}
             className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-glass-border flex items-center justify-center hover:bg-background transition-colors"
           >
             <X className="w-5 h-5 text-foreground" />
           </button>
 
           {/* Scanning overlay when analyzing */}
           {analysisState === "analyzing" && (
             <div className="absolute inset-0 pointer-events-none">
               <div className="absolute inset-0 bg-ios-blue/10" />
               <div
                 className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-ios-blue to-transparent"
                 style={{ animation: "scanLine 2s ease-in-out infinite" }}
               />
             </div>
           )}
 
           {/* Warning overlay */}
           {(analysisState === "warning" || priority > 7) && (
             <div className="absolute inset-0 pointer-events-none bg-ios-red/20 animate-pulse" />
           )}
         </>
       ) : (
         /* Upload prompt */
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-sm">
           <div
             className={cn(
               "w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center mb-4 transition-colors",
               isDragging ? "border-ios-blue bg-ios-blue/10" : "border-glass-border"
             )}
           >
             {isDragging ? (
               <Image className="w-8 h-8 text-ios-blue" />
             ) : (
               <Upload className="w-8 h-8 text-muted-foreground" />
             )}
           </div>
           <p className="text-foreground font-medium text-center px-8">
             {isDragging ? "Drop image here" : "Tap or drag image to analyze"}
           </p>
           <p className="text-muted-foreground text-sm mt-2">
             Supports JPG, PNG, WebP
           </p>
           
           {/* Camera icon hint */}
           <div className="absolute bottom-6 flex items-center gap-2 text-muted-foreground">
             <Camera className="w-4 h-4" />
             <span className="text-xs">Or use camera on mobile</span>
           </div>
         </div>
       )}
 
       {/* Corner brackets */}
       <div className="absolute inset-4 pointer-events-none">
         {[
           "top-0 left-0",
           "top-0 right-0",
           "bottom-0 left-0",
           "bottom-0 right-0",
         ].map((position, i) => (
           <div key={i} className={cn("absolute w-8 h-8", position)}>
             <div
               className={cn(
                 "absolute h-[2px] w-full transition-colors duration-300",
                 position.includes("top") ? "top-0" : "bottom-0",
                 position.includes("left") ? "left-0" : "right-0",
                 priority > 7 ? "bg-ios-red" : analysisState === "analyzing" ? "bg-ios-blue" : "bg-foreground/20"
               )}
             />
             <div
               className={cn(
                 "absolute w-[2px] h-full transition-colors duration-300",
                 position.includes("top") ? "top-0" : "bottom-0",
                 position.includes("left") ? "left-0" : "right-0",
                 priority > 7 ? "bg-ios-red" : analysisState === "analyzing" ? "bg-ios-blue" : "bg-foreground/20"
               )}
             />
           </div>
         ))}
       </div>
 
       <style>{`
         @keyframes scanLine {
           0% { top: 0%; opacity: 0; }
           10% { opacity: 0.8; }
           90% { opacity: 0.8; }
           100% { top: 100%; opacity: 0; }
         }
       `}</style>
     </div>
   );
 };