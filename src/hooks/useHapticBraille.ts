 import { useState, useCallback, useRef } from "react";
 
 // Standard Braille dot patterns (6-dot cell: dots 1-6)
 // Dot positions: 1 4
 //                2 5
 //                3 6
 const BRAILLE_MAP: Record<string, number[]> = {
   A: [1],
   B: [1, 2],
   C: [1, 4],
   D: [1, 4, 5],
   E: [1, 5],
   F: [1, 2, 4],
   G: [1, 2, 4, 5],
   H: [1, 2, 5],
   I: [2, 4],
   J: [2, 4, 5],
   K: [1, 3],
   L: [1, 2, 3],
   M: [1, 3, 4],
   N: [1, 3, 4, 5],
   O: [1, 3, 5],
   P: [1, 2, 3, 4],
   Q: [1, 2, 3, 4, 5],
   R: [1, 2, 3, 5],
   S: [2, 3, 4],
   T: [2, 3, 4, 5],
   U: [1, 3, 6],
   V: [1, 2, 3, 6],
   W: [2, 4, 5, 6],
   X: [1, 3, 4, 6],
   Y: [1, 3, 4, 5, 6],
   Z: [1, 3, 5, 6],
   " ": [], // Space between words
 };
 
 // Timing constants (in ms)
 const DOT_VIBRATION = 100;      // Dot (•): 100ms vibration
 const EMPTY_PAUSE = 50;         // Empty space: 50ms pause
 const CHAR_SEPARATOR = 300;     // Character separator: 300ms pause
 
 /**
  * Convert Braille dot pattern to vibration array
  * A Braille cell has 6 positions - we vibrate for present dots, pause for absent
  */
 const dotsToVibrationPattern = (dots: number[]): number[] => {
   const pattern: number[] = [];
   
   // If no dots (space character), just add a longer pause
   if (dots.length === 0) {
     return [0, CHAR_SEPARATOR];
   }
   
   // Iterate through all 6 dot positions
   for (let pos = 1; pos <= 6; pos++) {
     if (dots.includes(pos)) {
       // Dot present: vibrate
       pattern.push(DOT_VIBRATION);
     } else {
       // Dot absent: pause (represented as 0 vibration)
       pattern.push(0);
     }
     // Add pause between dot positions
     pattern.push(EMPTY_PAUSE);
   }
   
   return pattern;
 };
 
 /**
  * Build full vibration pattern for a text string
  */
 const textToVibrationPattern = (text: string): number[] => {
   const upperText = text.toUpperCase();
   const fullPattern: number[] = [];
   
   for (let i = 0; i < upperText.length; i++) {
     const char = upperText[i];
     const dots = BRAILLE_MAP[char];
     
     if (dots !== undefined) {
       const charPattern = dotsToVibrationPattern(dots);
       fullPattern.push(...charPattern);
       
       // Add character separator pause (except after last char)
       if (i < upperText.length - 1) {
         fullPattern.push(0, CHAR_SEPARATOR);
       }
     }
   }
   
   return fullPattern;
 };
 
 /**
  * Calculate total duration of a vibration pattern
  */
 const calculatePatternDuration = (pattern: number[]): number => {
   return pattern.reduce((sum, val) => sum + val, 0);
 };
 
 export const useHapticBraille = () => {
   const [isPlaying, setIsPlaying] = useState(false);
   const [currentChar, setCurrentChar] = useState<string | null>(null);
   const [currentDots, setCurrentDots] = useState<number[]>([]);
   const timeoutRef = useRef<NodeJS.Timeout | null>(null);
   const abortRef = useRef(false);
 
   const stopHaptic = useCallback(() => {
     abortRef.current = true;
     if (timeoutRef.current) {
       clearTimeout(timeoutRef.current);
       timeoutRef.current = null;
     }
     if ("vibrate" in navigator) {
       navigator.vibrate(0); // Stop any ongoing vibration
     }
     setIsPlaying(false);
     setCurrentChar(null);
     setCurrentDots([]);
   }, []);
 
   const playHapticMessage = useCallback(async (text: string): Promise<void> => {
     if (!("vibrate" in navigator)) {
       console.warn("Vibration API not supported");
       return;
     }
 
     // Stop any existing playback
     stopHaptic();
     abortRef.current = false;
     setIsPlaying(true);
 
     const upperText = text.toUpperCase();
 
     // Play each character sequentially
     for (let i = 0; i < upperText.length; i++) {
       if (abortRef.current) break;
 
       const char = upperText[i];
       const dots = BRAILLE_MAP[char];
 
       if (dots !== undefined) {
         setCurrentChar(char);
         setCurrentDots(dots);
 
         const pattern = dotsToVibrationPattern(dots);
         const duration = calculatePatternDuration(pattern);
 
         try {
           navigator.vibrate(pattern);
         } catch (e) {
           console.warn("Vibration failed:", e);
         }
 
         // Wait for pattern to complete + character separator
         await new Promise<void>((resolve) => {
           timeoutRef.current = setTimeout(resolve, duration + CHAR_SEPARATOR);
         });
       }
     }
 
     if (!abortRef.current) {
       setIsPlaying(false);
       setCurrentChar(null);
       setCurrentDots([]);
     }
   }, [stopHaptic]);
 
   return {
     playHapticMessage,
     stopHaptic,
     isPlaying,
     currentChar,
     currentDots,
   };
 };