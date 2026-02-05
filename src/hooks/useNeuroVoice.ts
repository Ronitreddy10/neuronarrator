import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SpeakOptions {
  priority?: number;
  rate?: number;
  pitch?: number;
  speaker?: "anushka" | "abhilash";
  onEnd?: () => void;
}

// ── Web Audio API singleton (much more reliable than HTML Audio on iOS) ──
let audioCtx: AudioContext | null = null;
let audioCtxUnlocked = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// Call this ONCE on the very first user tap — unlocks audio playback on iOS/Safari
export const unlockAudioForMobile = (): Promise<void> => {
  return new Promise((resolve) => {
    if (audioCtxUnlocked) {
      resolve();
      return;
    }

    const ctx = getAudioContext();

    // iOS requires resume() inside a user gesture
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        console.log("AudioContext unlocked (resumed)");
        audioCtxUnlocked = true;
        resolve();
      }).catch(() => {
        console.warn("AudioContext resume failed, still proceeding");
        audioCtxUnlocked = true;
        resolve();
      });
    } else {
      console.log("AudioContext already running");
      audioCtxUnlocked = true;
      resolve();
    }

    // Also play a tiny silent buffer to be extra safe (some iOS versions need this)
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      // ignore
    }
  });
};

export const useNeuroVoice = () => {
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const onEndCallbackRef = useRef<(() => void) | null>(null);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  const fireOnEnd = useCallback(() => {
    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (onEndCallbackRef.current) {
      const cb = onEndCallbackRef.current;
      onEndCallbackRef.current = null;
      cb();
    }
    isLoadingRef.current = false;
  }, []);

  const speak = useCallback(async (text: string, priority: number = 5, options: SpeakOptions = {}) => {
    // If there's nothing to say, don't stall smart-loop callers waiting for onend.
    if (!text || !text.trim()) {
      if (options.onEnd) options.onEnd();
      return;
    }

    // Cancel any ongoing speech/request
    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Stop current Web Audio playback
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch {}
      currentSourceRef.current = null;
    }
    window.speechSynthesis?.cancel();

    onEndCallbackRef.current = options.onEnd || null;
    isLoadingRef.current = true;
    abortControllerRef.current = new AbortController();

    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          speaker: options.speaker ?? "anushka",
        },
      });

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) return;

      if (error) {
        console.error("TTS edge function error:", error);
        throw error;
      }

      // Handle rate limiting or timeout gracefully
      if (data?.rateLimited || data?.useBrowserFallback) {
        console.warn("TTS unavailable, using browser fallback");
        throw new Error("Use browser fallback");
      }

      if (!data?.audioBase64) {
        console.error("No audio data returned");
        throw new Error("No audio data");
      }

      // ── Play via Web Audio API (reliable on iOS) ──
      const ctx = getAudioContext();

      // Make sure context is running (iOS can suspend it)
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Decode base64 → ArrayBuffer → AudioBuffer
      const binaryString = atob(data.audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

      // Check again if aborted during decode
      if (abortControllerRef.current?.signal.aborted) return;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => {
        console.log("Web Audio ended, triggering next capture");
        currentSourceRef.current = null;
        fireOnEnd();
      };

      currentSourceRef.current = source;
      source.start(0);
      console.log("Web Audio playing via AudioContext");

      // Safety timer: guarantee onEnd fires
      const durationMs = (audioBuffer.duration * 1000) + 1500;
      safetyTimerRef.current = window.setTimeout(() => {
        console.warn("Safety timer: forcing onEnd (audio event may have not fired)");
        currentSourceRef.current = null;
        fireOnEnd();
      }, durationMs);

    } catch (err) {
      // Check if aborted - don't fallback if intentionally cancelled
      if (abortControllerRef.current?.signal.aborted) return;

      console.error("Sarvam TTS failed, falling back to browser TTS:", err);

      // Fallback to browser TTS
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate ?? 1.0;
        utterance.pitch = options.pitch ?? 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          console.log("Browser TTS ended, triggering next capture");
          fireOnEnd();
        };

        utterance.onerror = (e) => {
          console.error("Browser TTS error:", e);
          fireOnEnd();
        };

        window.speechSynthesis.speak(utterance);
        // Safety timer for browser TTS
        safetyTimerRef.current = window.setTimeout(() => {
          console.warn("Safety timer: forcing onEnd for browser TTS");
          fireOnEnd();
        }, 7000);
      } else {
        console.log("No TTS available, triggering next capture immediately");
        fireOnEnd();
      }
    }
  }, [fireOnEnd]);

  const stop = useCallback(() => {
    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch {}
      currentSourceRef.current = null;
    }
    window.speechSynthesis?.cancel();
    onEndCallbackRef.current = null;
    isLoadingRef.current = false;
  }, []);

  const isSpeaking = useCallback(() => {
    if (currentSourceRef.current) return true;
    return window.speechSynthesis?.speaking ?? false;
  }, []);

  const isLoading = useCallback(() => isLoadingRef.current, []);

  return { speak, stop, isSpeaking, isLoading };
};
