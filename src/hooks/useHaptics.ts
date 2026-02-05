 export const useHaptics = () => {
   const vibrate = (pattern: number | number[]) => {
     if ("vibrate" in navigator) {
       try {
         navigator.vibrate(pattern);
       } catch (e) {
         console.log("Vibration not supported on this device");
       }
     }
   };
 
   const sosPattern = () => {
     // SOS pattern: 3 short, 3 long, 3 short
     vibrate([500, 200, 500, 200, 500]);
   };
 
   const alertPattern = () => {
     vibrate([200, 100, 200, 100, 200]);
   };
 
   const singlePulse = () => {
     vibrate(100);
   };
 
   return { vibrate, sosPattern, alertPattern, singlePulse };
 };