import { useState, useCallback, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { faceDB, type FaceRecord } from '@/lib/faceDatabase';

// Model CDN URL
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// Match threshold - lower = stricter matching
const MATCH_THRESHOLD = 0.6;

export interface FaceMatch {
  name: string;
  known: boolean;
  descriptor?: Float32Array;
  distance?: number;
  id?: number;
}

export interface UseFaceRecognitionReturn {
  isModelsLoaded: boolean;
  isLoadingModels: boolean;
  modelLoadError: string | null;
  lastMatch: FaceMatch | null;
  lastUnknownDescriptor: Float32Array | null;
  isProcessing: boolean;
  storedFacesCount: number;
  detectAndMatch: (videoElement: HTMLVideoElement) => Promise<FaceMatch | null>;
  registerCurrentFace: (name: string) => Promise<boolean>;
  loadModels: () => Promise<void>;
  refreshStoredFaces: () => Promise<void>;
  clearAllFaces: () => Promise<void>;
}

// Calculate Euclidean distance between two descriptors
function euclideanDistance(desc1: Float32Array, desc2: Float32Array): number {
  if (desc1.length !== desc2.length) return Infinity;
  
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function useFaceRecognition(): UseFaceRecognitionReturn {
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [lastMatch, setLastMatch] = useState<FaceMatch | null>(null);
  const [lastUnknownDescriptor, setLastUnknownDescriptor] = useState<Float32Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [storedFacesCount, setStoredFacesCount] = useState(0);

  const storedFacesRef = useRef<FaceRecord[]>([]);
  const isProcessingRef = useRef(false);

  // Load face count on mount
  useEffect(() => {
    refreshStoredFaces();
  }, []);

  // Refresh stored faces from database
  const refreshStoredFaces = useCallback(async () => {
    try {
      const faces = await faceDB.getAllFaces();
      storedFacesRef.current = faces;
      setStoredFacesCount(faces.length);
    } catch (error) {
      console.error('Error loading stored faces:', error);
    }
  }, []);

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    if (isModelsLoaded || isLoadingModels) return;

    setIsLoadingModels(true);
    setModelLoadError(null);

    try {
      console.log('Loading face recognition models from:', MODEL_URL);

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      console.log('Face recognition models loaded successfully');
      setIsModelsLoaded(true);
      
      // Load stored faces after models are ready
      await refreshStoredFaces();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load models';
      console.error('Error loading face models:', error);
      setModelLoadError(errorMsg);
    } finally {
      setIsLoadingModels(false);
    }
  }, [isModelsLoaded, isLoadingModels, refreshStoredFaces]);

  // Detect face and match against stored faces
  const detectAndMatch = useCallback(async (videoElement: HTMLVideoElement): Promise<FaceMatch | null> => {
    if (!isModelsLoaded) {
      console.warn('Models not loaded yet');
      return null;
    }

    if (isProcessingRef.current) {
      return null;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      // Detect single face with landmarks and descriptor
      const detection = await faceapi
        .detectSingleFace(videoElement)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setLastMatch(null);
        return null;
      }

      const currentDescriptor = new Float32Array(detection.descriptor);
      
      // Fetch latest faces from database
      const storedFaces = storedFacesRef.current;

      if (storedFaces.length === 0) {
        // No stored faces - this is an unknown person
        const unknownMatch: FaceMatch = {
          name: 'Unknown',
          known: false,
          descriptor: currentDescriptor
        };
        setLastMatch(unknownMatch);
        setLastUnknownDescriptor(currentDescriptor);
        return unknownMatch;
      }

      // Find best match
      let bestMatch: FaceRecord | null = null;
      let bestDistance = Infinity;

      for (const face of storedFaces) {
        // Convert stored descriptor back to Float32Array if needed
        const storedDescriptor = face.descriptor instanceof Float32Array 
          ? face.descriptor 
          : new Float32Array(Object.values(face.descriptor));
        
        const distance = euclideanDistance(currentDescriptor, storedDescriptor);
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = face;
        }
      }

      if (bestMatch && bestDistance < MATCH_THRESHOLD) {
        // Known face matched
        const knownMatch: FaceMatch = {
          name: bestMatch.name,
          known: true,
          distance: bestDistance,
          id: bestMatch.id
        };
        setLastMatch(knownMatch);
        setLastUnknownDescriptor(null);
        return knownMatch;
      } else {
        // Unknown face (no match or distance too high)
        const unknownMatch: FaceMatch = {
          name: 'Unknown',
          known: false,
          descriptor: currentDescriptor,
          distance: bestDistance
        };
        setLastMatch(unknownMatch);
        setLastUnknownDescriptor(currentDescriptor);
        return unknownMatch;
      }
    } catch (error) {
      console.error('Face detection error:', error);
      return null;
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [isModelsLoaded]);

  // Register the current unknown face with a name
  const registerCurrentFace = useCallback(async (name: string): Promise<boolean> => {
    if (!lastUnknownDescriptor) {
      console.warn('No unknown face to register');
      return false;
    }

    try {
      await faceDB.addFace(name.trim(), lastUnknownDescriptor);
      await refreshStoredFaces();
      setLastUnknownDescriptor(null);
      
      // Update lastMatch to reflect the newly registered face
      setLastMatch({
        name: name.trim(),
        known: true
      });

      console.log(`Face registered as: ${name}`);
      return true;
    } catch (error) {
      console.error('Error registering face:', error);
      return false;
    }
  }, [lastUnknownDescriptor, refreshStoredFaces]);

  // Clear all stored faces
  const clearAllFaces = useCallback(async () => {
    try {
      await faceDB.clearAllFaces();
      await refreshStoredFaces();
      setLastMatch(null);
      setLastUnknownDescriptor(null);
    } catch (error) {
      console.error('Error clearing faces:', error);
    }
  }, [refreshStoredFaces]);

  return {
    isModelsLoaded,
    isLoadingModels,
    modelLoadError,
    lastMatch,
    lastUnknownDescriptor,
    isProcessing,
    storedFacesCount,
    detectAndMatch,
    registerCurrentFace,
    loadModels,
    refreshStoredFaces,
    clearAllFaces
  };
}
