import { useState, useCallback, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { faceDB, type FaceRecord, type RelationType } from '@/lib/faceDatabase';

// Model CDN URL
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// Match threshold - lower = stricter matching
const MATCH_THRESHOLD = 0.6;

// Time thresholds for contextual announcements
const DAYS_THRESHOLD = 3; // Days before mentioning "haven't seen in X days"

export interface FaceContext {
  name: string;
  relation: RelationType;
  lastSeen: Date;
  daysSinceLastSeen: number;
  isLongAbsence: boolean; // > 3 days
}

export interface FaceMatch {
  name: string;
  known: boolean;
  descriptor?: Float32Array;
  distance?: number;
  id?: number;
  // Extended context for known faces
  context?: FaceContext;
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
  registerCurrentFace: (name: string, relation: RelationType) => Promise<boolean>;
  loadModels: () => Promise<void>;
  retryLoadModels: () => Promise<void>;
  refreshStoredFaces: () => Promise<void>;
  clearAllFaces: () => Promise<void>;
  generateSpeechText: (match: FaceMatch) => string;
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

// Calculate days between two dates
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Format relation for speech (possessive form)
function formatRelationForSpeech(relation: RelationType): string {
  switch (relation) {
    case 'Family':
      return 'your family member';
    case 'Friend':
      return 'your friend';
    case 'Doctor':
      return 'your doctor';
    case 'Colleague':
      return 'your colleague';
    case 'Stranger':
      return 'a stranger';
    case 'Acquaintance':
    default:
      return 'your acquaintance';
  }
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

  // Load face-api.js models with retry logic for mobile
  const loadModels = useCallback(async () => {
    if (isModelsLoaded || isLoadingModels) return;

    setIsLoadingModels(true);
    setModelLoadError(null);

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Loading face recognition models (attempt ${attempt}/${maxRetries}) from:`, MODEL_URL);

        // Load models sequentially on mobile to avoid memory issues
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        console.log('SSD MobileNet loaded');
        
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('Face Landmark model loaded');
        
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log('Face Recognition model loaded');

        console.log('All face recognition models loaded successfully');
        setIsModelsLoaded(true);
        setIsLoadingModels(false);
        setModelLoadError(null);
        
        // Load stored faces after models are ready
        await refreshStoredFaces();
        return; // Success - exit the retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Failed to load models');
        console.error(`Model loading attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // All retries failed
    const errorMsg = lastError?.message || 'Failed to load face recognition models';
    console.error('All model loading attempts failed:', errorMsg);
    setModelLoadError(`${errorMsg}. Check your internet connection and try again.`);
    setIsLoadingModels(false);
  }, [isModelsLoaded, isLoadingModels, refreshStoredFaces]);

  // Generate contextual speech text for a match
  const generateSpeechText = useCallback((match: FaceMatch): string => {
    if (!match.known) {
      // Unknown person - stay silent or subtle announcement
      return 'An unknown person is present.';
    }

    if (!match.context) {
      // Fallback if no context
      return `${match.name} is here.`;
    }

    const { name, relation, daysSinceLastSeen, isLongAbsence } = match.context;
    const relationText = formatRelationForSpeech(relation);

    if (isLongAbsence) {
      // Time-aware announcement
      return `${name}, ${relationText}. You haven't seen them in ${daysSinceLastSeen} days.`;
    } else {
      // Standard announcement
      return `${name}, ${relationText}, is here.`;
    }
  }, []);

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
        // Calculate temporal context
        const now = new Date();
        const lastSeen = bestMatch.lastSeen instanceof Date 
          ? bestMatch.lastSeen 
          : new Date(bestMatch.lastSeen);
        const daysSinceLastSeen = daysBetween(lastSeen, now);
        
        // Create context object
        const context: FaceContext = {
          name: bestMatch.name,
          relation: bestMatch.relation || 'Acquaintance',
          lastSeen,
          daysSinceLastSeen,
          isLongAbsence: daysSinceLastSeen >= DAYS_THRESHOLD
        };

        // Update lastSeen in database (async, don't block)
        if (bestMatch.id) {
          faceDB.updateLastSeen(bestMatch.id).catch(err => 
            console.error('Failed to update lastSeen:', err)
          );
        }

        // Known face matched with full context
        const knownMatch: FaceMatch = {
          name: bestMatch.name,
          known: true,
          distance: bestDistance,
          id: bestMatch.id,
          context
        };
        setLastMatch(knownMatch);
        setLastUnknownDescriptor(null);
        
        // Also refresh stored faces to get updated lastSeen for next cycle
        refreshStoredFaces();
        
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
  }, [isModelsLoaded, refreshStoredFaces]);

  // Register the current unknown face with name and relationship
  const registerCurrentFace = useCallback(async (name: string, relation: RelationType): Promise<boolean> => {
    if (!lastUnknownDescriptor) {
      console.warn('No unknown face to register');
      return false;
    }

    try {
      await faceDB.addFace(name.trim(), lastUnknownDescriptor, relation);
      await refreshStoredFaces();
      setLastUnknownDescriptor(null);
      
      // Update lastMatch to reflect the newly registered face with context
      const now = new Date();
      setLastMatch({
        name: name.trim(),
        known: true,
        context: {
          name: name.trim(),
          relation,
          lastSeen: now,
          daysSinceLastSeen: 0,
          isLongAbsence: false
        }
      });

      console.log(`Face registered as: ${name} (${relation})`);
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

  // Force retry loading models (resets error state first)
  const retryLoadModels = useCallback(async () => {
    setModelLoadError(null);
    setIsLoadingModels(false);
    // Small delay to reset state
    await new Promise(resolve => setTimeout(resolve, 100));
    await loadModels();
  }, [loadModels]);

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
    retryLoadModels,
    refreshStoredFaces,
    clearAllFaces,
    generateSpeechText
  };
}
