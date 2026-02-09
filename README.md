# NeuroNarrator 👁️‍🗨️

**An AI-powered assistive vision app for blind and visually impaired users.**

NeuroNarrator uses your device camera, real-time AI vision, voice commands, and multi-sensory feedback (speech, haptics, spatial audio) to describe the world around you — like having a caring friend walking beside you.

---

## 🎯 Core Concept

The entire app is designed as a **voice-first, touch-first** interface. There are no small buttons or complex menus. The full screen is an invisible button — hold anywhere to speak a command, release to execute.

---

## ✨ Features

### 🗣️ Three Vision Modes

| Mode | Trigger Command | What It Does |
|------|----------------|--------------|
| **Standard** | "Describe" / "Read" / "What is this" | Describes the scene in natural, friendly language with spatial cues ("5 steps ahead there's a chair") |
| **Currency Reader** 💰 | "Count notes" / "Money" / "Currency" | Identifies Indian Rupee denominations (₹10–₹2000), counts multiple notes, and sums the total |
| **Item Finder** 🔍 | "Find my keys" / "Where is my bottle" | Geiger-counter-style scanning — high-pitch ping (800 Hz) + strong vibration when found, low-pitch thrum (200 Hz) when not |

### 🎤 Voice Control

- **Push-to-Talk**: Hold anywhere on screen → speak → release to process
- **Hands-Free**: Say "Neuro find my keys" or "Neuro count notes" without holding
- **Language**: Tuned for Indian English (`en-IN`) accent recognition
- **Feedback**: Spoken confirmation on every mode switch + tactile vibration

### 👤 Face Recognition

- **Client-side neural networks** via `face-api.js` — no cloud upload of face data
- **Voice registration**: Say "Neuro remember Ronit" while someone faces the camera
- **Smart context**: "Hey, your friend Ronit is here! You haven't seen him in about a week"
- **Privacy**: All face data stored locally via Dexie.js (IndexedDB)

### ⚠️ Hazard Detection

- **10-level priority system** from casual awareness (1) to life-threatening (10)
- **Aggressive fire/smoke detection**: Any flame triggers Priority 8+ with SOS vibration, red screen border, and urgent speech
- **Haptic Braille**: Hazard keywords encoded in vibration patterns
- **Spatial audio**: Hazard sounds scaled by danger level

### 🔊 Multi-Sensory Feedback

| Channel | Usage |
|---------|-------|
| **Speech (TTS)** | Scene descriptions, currency totals, item locations — via Lovable Cloud backend function |
| **Haptic vibration** | SOS patterns for hazards, confirmation pulses for mode switches, Braille encoding |
| **Spatial audio** | Finder ping/thrum (800 Hz / 200 Hz), hazard alarm tones, listening chimes |
| **Visual borders** | 🟢 Green = Currency Mode · 🟡 Yellow (pulsing) = Finder Mode · 🔵 Blue = Standard Mode |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)               │
│                                                   │
│  LiveCamera ──→ base64 frame ──→ analyzeImage()  │
│       ↑                              ↓            │
│  Push-to-Talk        Lovable Cloud Edge Function  │
│  (useVoiceControl)    (analyze-image)             │
│       ↓                              ↓            │
│  Mode Switch         ┌──────────────────────┐    │
│  (standard/           │  Google Gemini 3     │    │
│   currency/           │  Vision AI           │    │
│   finder)             │  (multimodal)        │    │
│                       └──────────────────────┘    │
│       ↓                              ↓            │
│  useNeuroVoice ←── description ──────┘            │
│  useHaptics                                       │
│  useFinderSound                                   │
│  useHazardSound                                   │
│  useFaceRecognition (client-side)                 │
└─────────────────────────────────────────────────┘
```

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useVoiceControl` | Push-to-talk via Web Speech API; parses commands into modes |
| `useVoiceCommand` | Always-on listener for hands-free "Neuro ..." commands |
| `useNeuroVoice` | Text-to-speech via backend function with queue management |
| `useHaptics` | Vibration patterns (SOS, confirmation, Braille) |
| `useFinderSound` | 800 Hz found-ping / 200 Hz not-found-thrum via Web Audio API |
| `useHazardSound` | Priority-scaled alarm tones |
| `useFaceRecognition` | face-api.js detection + Dexie.js local storage |
| `useHapticBraille` | Encodes text to Braille vibration patterns |

### Backend Functions (Lovable Cloud)

| Function | Purpose |
|----------|---------|
| `analyze-image` | Vision analysis via Google Gemini 3 (multimodal). Supports general, reader, currency, and finder system prompts. |
| `text-to-speech` | Converts description text to speech audio |
| `speech-to-text` | Processes voice input for commands |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Animations** | Framer Motion |
| **Camera** | react-webcam |
| **Face AI** | face-api.js (TinyFaceDetector + SSD MobileNet) |
| **Local DB** | Dexie.js (IndexedDB wrapper) |
| **Voice Input** | Web Speech API (SpeechRecognition) |
| **Audio Output** | Web Audio API (OscillatorNode) |
| **Icons** | Lucide React |
| **Backend** | Lovable Cloud (Edge Functions) |
| **Vision AI** | Google Gemini 3 (multimodal vision) |
| **Routing** | React Router v6 |

---

## 📱 Device Support

- **Mobile (primary)**: Full-screen touch interaction, rear camera, haptic feedback
- **Desktop/MacBook**: Front-facing camera auto-detected, keyboard-friendly
- **Camera**: Auto-selects `environment` (rear) on mobile, `user` (front) on desktop

---

## 🚀 Getting Started

1. Open the app in a browser (Chrome recommended for Web Speech API support)
2. Tap anywhere on screen to start the camera and scanning
3. The AI will begin describing your surroundings automatically
4. **Hold the screen** and speak a command to switch modes:
   - "Count notes" → Currency Reader
   - "Find my keys" → Item Finder  
   - "Describe" → Standard Mode
5. Release to process the command

---

## 📂 Project Structure

```
src/
├── pages/
│   └── Index.tsx              # Main app page — camera loop, mode routing, push-to-talk
├── components/
│   ├── LiveCamera.tsx         # Webcam capture with auto-device detection
│   ├── DynamicIsland.tsx      # Status indicator (mode badge, scanning state)
│   ├── CaptionDisplay.tsx     # Live caption overlay
│   ├── PushToTalkOverlay.tsx  # Full-screen invisible touch target + mic animation
│   ├── FaceRecognitionOverlay.tsx  # Face detection bounding boxes
│   ├── HapticBrailleIndicator.tsx  # Visual Braille dot display
│   ├── WarningBanner.tsx      # Hazard alert banner
│   ├── SettingsModal.tsx      # App settings
│   └── AddPersonModal.tsx     # Face registration dialog
├── hooks/
│   ├── useVoiceControl.ts     # Push-to-talk engine (Web Speech API, en-IN)
│   ├── useVoiceCommand.ts     # Always-on "Neuro ..." listener
│   ├── useNeuroVoice.ts       # TTS via backend
│   ├── useHaptics.ts          # Vibration patterns
│   ├── useHapticBraille.ts    # Text → Braille vibration encoding
│   ├── useFinderSound.ts      # Geiger counter audio (800Hz/200Hz)
│   ├── useHazardSound.ts      # Priority-scaled alarm tones
│   ├── useFaceRecognition.ts  # face-api.js + Dexie.js
│   └── useVoiceInput.ts       # Generic voice input utility
├── services/
│   └── vision.ts              # API client for analyze-image edge function
├── lib/
│   ├── faceDatabase.ts        # Dexie.js face storage schema
│   └── utils.ts               # Tailwind merge utility
└── integrations/
    └── supabase/              # Auto-generated Lovable Cloud client

supabase/functions/
├── analyze-image/index.ts     # Vision AI — Groq Llama 4 → Gemini fallback
├── text-to-speech/index.ts    # TTS backend
└── speech-to-text/index.ts    # STT backend
```

---

## 🌐 Live App

**Published**: [neuronarrator.lovable.app](https://neuronarrator.lovable.app)

---

## 📄 License

Built with [Lovable](https://lovable.dev).
