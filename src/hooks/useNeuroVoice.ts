import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SpeakOptions {
  priority?: number;
  rate?: number;
  pitch?: number;
  speaker?: "anushka" | "abhilash";
  onEnd?: () => void;
}

// iOS/Safari requires audio context to be unlocked by user gesture
let audioContextUnlocked = false;
let silentAudio: HTMLAudioElement | null = null;

// Call this on first user tap to unlock audio on iOS
export const unlockAudioForMobile = (): Promise<void> => {
  return new Promise((resolve) => {
    if (audioContextUnlocked) {
      resolve();
      return;
    }

    // Create a silent audio element and play it
    silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
    silentAudio.volume = 0.01;
    
    const playPromise = silentAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("iOS audio unlocked successfully");
          audioContextUnlocked = true;
          resolve();
        })
        .catch((e) => {
          console.warn("Could not unlock audio:", e);
          // Still mark as attempted so we don't block
          audioContextUnlocked = true;
          resolve();
        });
    } else {
      audioContextUnlocked = true;
      resolve();
    }
  });
};

export const useNeuroVoice = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndCallbackRef = useRef<(() => void) | null>(null);
   const isLoadingRef = useRef(false);
   const abortControllerRef = useRef<AbortController | null>(null);
 
   const speak = useCallback(async (text: string, priority: number = 5, options: SpeakOptions = {}) => {
    // If there's nothing to say, don't stall smart-loop callers waiting for onend.
    if (!text || !text.trim()) {
      if (options.onEnd) options.onEnd();
      return;
    }

     // Cancel any ongoing speech/request
     if (abortControllerRef.current) {
       abortControllerRef.current.abort();
     }
     if (audioRef.current) {
       audioRef.current.pause();
       audioRef.current.currentTime = 0;
       audioRef.current = null;
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
       if (abortControllerRef.current?.signal.aborted) {
         return;
       }
 
       if (error) {
         console.error("TTS edge function error:", error);
         throw error;
       }
 
       if (!data?.audioBase64) {
         console.error("No audio data returned");
         throw new Error("No audio data");
       }
 
       // Create audio from base64 - Sarvam returns audio/mpeg format
       const audioBlob = await fetch(`data:audio/mpeg;base64,${data.audioBase64}`).then(r => r.blob());
       const audioUrl = URL.createObjectURL(audioBlob);
       const audio = new Audio(audioUrl);
       audioRef.current = audio;
 
       // Set volume
       audio.volume = 1.0;
 
       audio.onended = () => {
         console.log("Audio ended, triggering next capture");
         URL.revokeObjectURL(audioUrl);
         if (onEndCallbackRef.current) {
           onEndCallbackRef.current();
           onEndCallbackRef.current = null;
         }
         isLoadingRef.current = false;
       };
 
       audio.onerror = (e) => {
         console.error("Audio playback error:", e);
         URL.revokeObjectURL(audioUrl);
         if (onEndCallbackRef.current) {
           console.log("Audio error, triggering next capture");
           onEndCallbackRef.current();
           onEndCallbackRef.current = null;
         }
         isLoadingRef.current = false;
       };
 
       // Play with user interaction handling
       try {
         await audio.play();
         console.log("Sarvam audio playing");
       } catch (playError) {
         console.error("Audio play failed:", playError);
         throw playError;
       }
     } catch (err) {
       // Check if aborted - don't fallback if intentionally cancelled
       if (abortControllerRef.current?.signal.aborted) {
         return;
       }
 
       console.error("Sarvam TTS failed, falling back to browser TTS:", err);
       isLoadingRef.current = false;
 
       // Fallback to browser TTS
       if (window.speechSynthesis) {
         const utterance = new SpeechSynthesisUtterance(text);
         utterance.rate = options.rate ?? 1.0;
         utterance.pitch = options.pitch ?? 1.0;
         utterance.volume = 1.0;
 
         utterance.onend = () => {
           console.log("Browser TTS ended, triggering next capture");
           if (onEndCallbackRef.current) {
             onEndCallbackRef.current();
             onEndCallbackRef.current = null;
           }
         };
 
         utterance.onerror = (e) => {
           console.error("Browser TTS error:", e);
           if (onEndCallbackRef.current) {
             onEndCallbackRef.current();
             onEndCallbackRef.current = null;
           }
         };
 
         window.speechSynthesis.speak(utterance);
       } else {
         // No fallback available, trigger callback anyway
         console.log("No TTS available, triggering next capture immediately");
         if (onEndCallbackRef.current) {
           onEndCallbackRef.current();
           onEndCallbackRef.current = null;
         }
       }
     }
   }, []);
 
   const stop = useCallback(() => {
     if (abortControllerRef.current) {
       abortControllerRef.current.abort();
       abortControllerRef.current = null;
     }
     if (audioRef.current) {
       audioRef.current.pause();
       audioRef.current.currentTime = 0;
       audioRef.current = null;
     }
     window.speechSynthesis?.cancel();
    onEndCallbackRef.current = null;
     isLoadingRef.current = false;
   }, []);
 
   const isSpeaking = useCallback(() => {
     if (audioRef.current && !audioRef.current.paused) {
       return true;
     }
     return window.speechSynthesis?.speaking ?? false;
   }, []);
 
   const isLoading = useCallback(() => isLoadingRef.current, []);
 
   return { speak, stop, isSpeaking, isLoading };
 };