import { useRef, useCallback, useEffect, useState } from "react";

/**
 * Always-on voice command listener using the browser's free SpeechRecognition API.
 * Listens for "neuro remember [name]" wake phrase to register faces hands-free.
 * Also supports "neuro forget all" to clear faces.
 */

// Extend Window for webkit prefix
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

const WAKE_PHRASE = "neuro remember";
const CLEAR_PHRASE = "neuro forget all";

interface UseVoiceCommandOptions {
  onRememberCommand: (name: string) => void;
  onClearCommand: () => void;
  enabled: boolean;
}

export function useVoiceCommand({ onRememberCommand, onClearCommand, enabled }: UseVoiceCommandOptions) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isStoppedManuallyRef = useRef(false);
  const isRunningRef = useRef(false);

  const startListening = useCallback(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser");
      return;
    }

    // Don't restart if already running
    if (isRunningRef.current) return;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      isRunningRef.current = true;
      setIsListening(true);
      console.log("Voice command listener started");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Check all results from the current batch
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue; // Only process final results
        
        // Check all alternatives for the best match
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.toLowerCase().trim();
          console.log("Voice heard:", transcript);

          // Check for "neuro remember [name]"
          if (transcript.includes("neuro remember") || transcript.includes("neuro, remember") || transcript.includes("neural remember")) {
            // Extract name after the wake phrase
            let name = "";
            const patterns = ["neuro remember", "neuro, remember", "neural remember", "neuro remembered"];
            for (const pattern of patterns) {
              const idx = transcript.indexOf(pattern);
              if (idx !== -1) {
                name = transcript.slice(idx + pattern.length).trim();
                break;
              }
            }

            if (name && name.length >= 2) {
              // Capitalize the name
              const cleanName = name
                .replace(/[.!?,;:]/g, "")
                .trim()
                .split(" ")
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(" ");

              console.log("Voice command: REMEMBER ->", cleanName);
              setLastCommand(`Remember: ${cleanName}`);
              onRememberCommand(cleanName);
              return;
            }
          }

          // Check for "neuro forget all"
          if (transcript.includes("neuro forget all") || transcript.includes("neural forget all")) {
            console.log("Voice command: FORGET ALL");
            setLastCommand("Forget all faces");
            onClearCommand();
            return;
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" and "aborted" are normal - just restart
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      console.warn("Voice command error:", event.error);
    };

    recognition.onend = () => {
      isRunningRef.current = false;
      setIsListening(false);
      // Auto-restart unless manually stopped — longer delay to avoid spam
      if (!isStoppedManuallyRef.current && enabled) {
        setTimeout(() => {
          if (!isStoppedManuallyRef.current && enabled && !isRunningRef.current) {
            try {
              recognition.start();
            } catch (_) {}
          }
        }, 1000);
      }
    };

    isStoppedManuallyRef.current = false;
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start voice command listener:", err);
    }
  }, [onRememberCommand, onClearCommand, enabled]);

  const stopListening = useCallback(() => {
    isStoppedManuallyRef.current = true;
    isRunningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Auto-start/stop based on enabled flag
  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, startListening, stopListening]);

  return { isListening, lastCommand };
}
