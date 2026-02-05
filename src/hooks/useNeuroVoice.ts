 import { useCallback, useRef } from "react";
 
 interface SpeakOptions {
   priority?: number;
   rate?: number;
   pitch?: number;
 }
 
 export const useNeuroVoice = () => {
   const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
 
   const speak = useCallback((text: string, priority: number = 5, options: SpeakOptions = {}) => {
     if (!window.speechSynthesis) {
       console.warn("Speech synthesis not supported");
       return;
     }
 
     // High priority (10) cancels current speech immediately
     if (priority >= 10) {
       window.speechSynthesis.cancel();
     }
 
     const utterance = new SpeechSynthesisUtterance(text);
     
     // Configure voice settings for a calm, professional tone
     utterance.rate = options.rate ?? 0.9;
     utterance.pitch = options.pitch ?? 1.0;
     utterance.volume = 1.0;
 
     // Try to get a good English voice
     const voices = window.speechSynthesis.getVoices();
     const preferredVoice = voices.find(
       (voice) => voice.lang.startsWith("en") && voice.name.includes("Samantha")
     ) || voices.find(
       (voice) => voice.lang.startsWith("en-US")
     ) || voices[0];
 
     if (preferredVoice) {
       utterance.voice = preferredVoice;
     }
 
     utteranceRef.current = utterance;
     window.speechSynthesis.speak(utterance);
   }, []);
 
   const stop = useCallback(() => {
     if (window.speechSynthesis) {
       window.speechSynthesis.cancel();
     }
   }, []);
 
   const isSpeaking = useCallback(() => {
     return window.speechSynthesis?.speaking ?? false;
   }, []);
 
   return { speak, stop, isSpeaking };
 };