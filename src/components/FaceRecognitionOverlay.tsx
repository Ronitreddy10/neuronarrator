import { motion, AnimatePresence } from "framer-motion";
import { User, UserX, Brain, Loader2, UserPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FaceMatch } from "@/hooks/useFaceRecognition";

interface FaceRecognitionOverlayProps {
  isModelsLoaded: boolean;
  isLoadingModels: boolean;
  modelLoadError: string | null;
  lastMatch: FaceMatch | null;
  hasUnknownFace: boolean;
  storedFacesCount: number;
  onAddPerson: () => void;
  onClearFaces: () => void;
  isVisible: boolean;
}

export const FaceRecognitionOverlay = ({
  isModelsLoaded,
  isLoadingModels,
  modelLoadError,
  lastMatch,
  hasUnknownFace,
  storedFacesCount,
  onAddPerson,
  onClearFaces,
  isVisible
}: FaceRecognitionOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className="absolute top-20 left-4 right-4 z-20 flex flex-col gap-2">
      {/* Model Loading Status */}
      <AnimatePresence>
        {isLoadingModels && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel super-ellipse-sm p-3 flex items-center gap-3"
          >
            <Brain className="w-5 h-5 text-ios-purple animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Loading Neural Nets...</p>
              <p className="text-xs text-muted-foreground">Initializing face recognition</p>
            </div>
            <Loader2 className="w-4 h-4 text-ios-blue animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Error */}
      <AnimatePresence>
        {modelLoadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel super-ellipse-sm p-3 border border-ios-red/30 bg-ios-red/10"
          >
            <p className="text-sm font-medium text-ios-red">Model Load Failed</p>
            <p className="text-xs text-muted-foreground">{modelLoadError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Face Recognition Result */}
      <AnimatePresence mode="wait">
        {isModelsLoaded && lastMatch && (
          <motion.div
            key={lastMatch.known ? lastMatch.name : 'unknown'}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "glass-panel super-ellipse-sm p-4",
              lastMatch.known 
                ? "border border-ios-green/30 bg-ios-green/10" 
                : "border border-ios-orange/30 bg-ios-orange/10"
            )}
          >
            <div className="flex items-center gap-3">
              {lastMatch.known ? (
                <div className="w-10 h-10 rounded-full bg-ios-green/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-ios-green" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-ios-orange/20 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-ios-orange" />
                </div>
              )}
              <div className="flex-1">
                <p className={cn(
                  "text-lg font-semibold",
                  lastMatch.known ? "text-ios-green" : "text-ios-orange"
                )}>
                  {lastMatch.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lastMatch.known 
                    ? `Confidence: ${lastMatch.distance ? ((1 - lastMatch.distance) * 100).toFixed(0) : 100}%`
                    : "Face not recognized"
                  }
                </p>
              </div>
              {!lastMatch.known && hasUnknownFace && (
                <Button
                  size="sm"
                  onClick={onAddPerson}
                  className="bg-ios-blue hover:bg-ios-blue/90 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stored Faces Count & Clear Button */}
      <AnimatePresence>
        {isModelsLoaded && storedFacesCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between px-2"
          >
            <p className="text-xs text-muted-foreground">
              {storedFacesCount} face{storedFacesCount !== 1 ? 's' : ''} in memory
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFaces}
              className="text-xs text-muted-foreground hover:text-ios-red"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
