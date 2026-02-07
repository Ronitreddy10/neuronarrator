import { cn } from "@/lib/utils";
import { type CommandMode } from "@/hooks/useVoiceControl";

interface DynamicIslandProps {
  status: "idle" | "analyzing" | "success" | "warning" | "error";
  priority?: number;
  commandMode?: CommandMode;
}

export const DynamicIsland = ({ status, priority = 0, commandMode = "standard" }: DynamicIslandProps) => {
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
        if (isHighPriority) return "bg-ios-red status-analyzing";
        if (commandMode === "currency") return "bg-ios-green";
        if (commandMode === "finder") return "bg-yellow-400";
        return "bg-ios-blue";
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
        if (isHighPriority) return "text-ios-red";
        if (commandMode === "currency") return "text-ios-green";
        if (commandMode === "finder") return "text-yellow-400";
        return "text-ios-blue";
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
        if (commandMode === "currency") return "Reading Currency...";
        if (commandMode === "finder") return "Searching...";
        return "Analyzing Scene...";
      case "success":
        if (isHighPriority) return "⚠ High Priority Alert";
        if (commandMode === "currency") return "💰 Currency Detected";
        if (commandMode === "finder") return "🔍 Item Finder";
        return "Analysis Complete";
      default:
        return "Ready";
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
