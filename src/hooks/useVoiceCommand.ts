import { useRef, useCallback, useEffect, useState } from "react";

/**
 * Always-on voice command listener using the browser's free SpeechRecognition API.
 * Listens for "neuro remember [name]" wake phrase to register faces hands-free.
 * Also supports "neuro forget all" to clear faces.
 *
 * Robust matching handles common mis-transcriptions on mobile.
 */

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

// All patterns that SpeechRecognition might hear for "neuro remember"
const REMEMBER_PATTERNS = [
  "neuro remember",
  "neuro, remember",
  "neural remember",
  "neuro remembered",
  "neuro remeber",
  "neuro member",
  "nero remember",
  "nero remeber",
  "neuro number",
  "neural member",
  "new remember",
  "neuro rember",
  "neuro remembar",
  "neuro remembers",
  "neuro rimember",
  "mirror remember",
  "nero member",
  "nero number",
  "your remember",
  "you remember",
  "euro remember",
];

const CLEAR_PATTERNS = [
  "neuro forget all",
  "neural forget all",
  "nero forget all",
  "neuro forget everything",
  "neuro clear all",
  "neural clear all",
];

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
  const restartTimeoutRef = useRef<number | null>(null);
  const consecutiveErrorsRef = useRef(0);

  // CRITICAL: Store callbacks in refs so SpeechRecognition doesn't restart
  // when parent re-renders with new callback references
  const onRememberRef = useRef(onRememberCommand);
  const onClearRef = useRef(onClearCommand);
  useEffect(() => { onRememberRef.current = onRememberCommand; }, [onRememberCommand]);
  useEffect(() => { onClearRef.current = onClearCommand; }, [onClearCommand]);

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("[VoiceCmd] SpeechRecognition not supported in this browser");
      return;
    }

    // Don't restart if already running
    if (isRunningRef.current) return;

    clearRestartTimeout();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Needed to keep session alive on mobile
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 5; // More alternatives = better chance of catching the phrase

    recognition.onstart = () => {
      isRunningRef.current = true;
      consecutiveErrorsRef.current = 0;
      setIsListening(true);
      console.log("[VoiceCmd] Listener started");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;

        // Check ALL alternatives
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.toLowerCase().trim();
          console.log(`[VoiceCmd] Heard (alt ${j}, conf ${result[j].confidence.toFixed(2)}):`, transcript);

          // Check for "neuro remember [name]"
          for (const pattern of REMEMBER_PATTERNS) {
            const idx = transcript.indexOf(pattern);
            if (idx !== -1) {
              let name = transcript.slice(idx + pattern.length).trim();

              // Clean up the name
              name = name
                .replace(/[.!?,;:'"]/g, "")
                .trim();

              if (name && name.length >= 2) {
                const cleanName = name
                  .split(" ")
                  .filter(w => w.length > 0)
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                  .join(" ");

                console.log("[VoiceCmd] ✅ REMEMBER command detected ->", cleanName);
                setLastCommand(`Remember: ${cleanName}`);
                onRememberRef.current(cleanName);
                return;
              }
            }
          }

          // Check for "neuro forget all"
          for (const pattern of CLEAR_PATTERNS) {
            if (transcript.includes(pattern)) {
              console.log("[VoiceCmd] ✅ FORGET ALL command detected");
              setLastCommand("Forget all faces");
              onClearRef.current();
              return;
            }
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        // Normal — don't count as real error
        return;
      }
      consecutiveErrorsRef.current += 1;
      console.warn("[VoiceCmd] Error:", event.error, `(consecutive: ${consecutiveErrorsRef.current})`);
    };

    recognition.onend = () => {
      isRunningRef.current = false;
      setIsListening(false);
      console.log("[VoiceCmd] Listener ended");

      // Auto-restart unless manually stopped
      if (!isStoppedManuallyRef.current && enabled) {
        // Back off if we're getting too many consecutive errors
        const delay = consecutiveErrorsRef.current > 3 ? 3000 : 800;
        clearRestartTimeout();
        restartTimeoutRef.current = window.setTimeout(() => {
          if (!isStoppedManuallyRef.current && enabled && !isRunningRef.current) {
            console.log("[VoiceCmd] Auto-restarting listener...");
            try {
              recognition.start();
            } catch (err) {
              console.warn("[VoiceCmd] Restart failed:", err);
              // Try creating a fresh instance after a delay
              restartTimeoutRef.current = window.setTimeout(() => {
                if (!isStoppedManuallyRef.current && enabled && !isRunningRef.current) {
                  startListening();
                }
              }, 2000);
            }
          }
        }, delay);
      }
    };

    isStoppedManuallyRef.current = false;
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("[VoiceCmd] Failed to start:", err);
      // Retry after delay
      restartTimeoutRef.current = window.setTimeout(() => {
        if (enabled && !isRunningRef.current) startListening();
      }, 2000);
    }
  }, [enabled, clearRestartTimeout]);

  const stopListening = useCallback(() => {
    isStoppedManuallyRef.current = true;
    isRunningRef.current = false;
    clearRestartTimeout();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, [clearRestartTimeout]);

  // Force restart — call this externally to ensure the listener is alive
  const forceRestart = useCallback(() => {
    if (!enabled) return;
    console.log("[VoiceCmd] Force-restarting listener");
    isStoppedManuallyRef.current = false;
    clearRestartTimeout();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    isRunningRef.current = false;
    // Small delay to let the old instance fully stop
    restartTimeoutRef.current = window.setTimeout(() => {
      startListening();
    }, 300);
  }, [enabled, clearRestartTimeout, startListening]);

  // Auto-start/stop based on enabled flag
  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled, startListening, stopListening]);

  // Periodic health check — if we should be listening but aren't, restart
  useEffect(() => {
    if (!enabled) return;

    const healthCheck = window.setInterval(() => {
      if (enabled && !isRunningRef.current && !isStoppedManuallyRef.current) {
        console.log("[VoiceCmd] Health check: listener not running, restarting...");
        startListening();
      }
    }, 8000);

    return () => window.clearInterval(healthCheck);
  }, [enabled, startListening]);

  return { isListening, lastCommand, forceRestart };
}
