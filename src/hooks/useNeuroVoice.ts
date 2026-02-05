 import { useCallback, useRef } from "react";
 import { supabase } from "@/integrations/supabase/client";
 
 interface SpeakOptions {
   priority?: number;
   rate?: number;
   pitch?: number;
   speaker?: "anushka" | "abhilash";
  onEnd?: () => void;
 }
 
 export const useNeuroVoice = () => {
   const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndCallbackRef = useRef<(() => void) | null>(null);
   const isLoadingRef = useRef(false);
 
   const speak = useCallback(async (text: string, priority: number = 5, options: SpeakOptions = {}) => {
    // If there's nothing to say, don't stall smart-loop callers waiting for onend.
    if (!text || !text.trim()) {
      if (options.onEnd) options.onEnd();
      return;
    }

     // High priority (10) cancels current speech immediately
     if (priority >= 10) {
       if (audioRef.current) {
         audioRef.current.pause();
         audioRef.current.currentTime = 0;
         audioRef.current = null;
       }
     }
 
     onEndCallbackRef.current = options.onEnd || null;
     isLoadingRef.current = true;
 
     try {
       const { data, error } = await supabase.functions.invoke('text-to-speech', {
         body: {
           text,
           speaker: options.speaker ?? "anushka",
         },
       });
 
       if (error) {
         console.error("TTS edge function error:", error);
         throw error;
       }
 
       if (!data?.audioBase64) {
         console.error("No audio data returned");
         throw new Error("No audio data");
       }
 
       // Create audio from base64
       const audioBlob = await fetch(`data:audio/wav;base64,${data.audioBase64}`).then(r => r.blob());
       const audioUrl = URL.createObjectURL(audioBlob);
       const audio = new Audio(audioUrl);
       audioRef.current = audio;
 
       audio.onended = () => {
         URL.revokeObjectURL(audioUrl);
         if (onEndCallbackRef.current) {
           onEndCallbackRef.current();
           onEndCallbackRef.current = null;
         }
         isLoadingRef.current = false;
       };
 
       audio.onerror = (e) => {
         console.warn("Audio playback error:", e);
         URL.revokeObjectURL(audioUrl);
         if (onEndCallbackRef.current) {
           onEndCallbackRef.current();
           onEndCallbackRef.current = null;
         }
         isLoadingRef.current = false;
       };
 
       await audio.play();
     } catch (err) {
       console.error("Sarvam TTS failed, falling back to browser TTS:", err);
       isLoadingRef.current = false;
 
       // Fallback to browser TTS
       if (window.speechSynthesis) {
         const utterance = new SpeechSynthesisUtterance(text);
         utterance.rate = options.rate ?? 0.9;
         utterance.pitch = options.pitch ?? 1.0;
         utterance.volume = 1.0;
 
         utterance.onend = () => {
           if (onEndCallbackRef.current) {
             onEndCallbackRef.current();
             onEndCallbackRef.current = null;
           }
         };
 
         utterance.onerror = () => {
           if (onEndCallbackRef.current) {
             onEndCallbackRef.current();
             onEndCallbackRef.current = null;
           }
         };
 
         window.speechSynthesis.speak(utterance);
       } else {
         // No fallback available, trigger callback anyway
         if (onEndCallbackRef.current) {
           onEndCallbackRef.current();
           onEndCallbackRef.current = null;
         }
       }
     }
   }, []);
 
   const stop = useCallback(() => {
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