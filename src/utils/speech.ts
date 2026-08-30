/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Text-to-Speech Engine using native Web Speech API SpeechSynthesis
 */

let selectedVoice: SpeechSynthesisVoice | null = null;
let isSpeakingActive = false;
const speechListeners = new Set<(speaking: boolean) => void>();

function notifySpeaking(speaking: boolean) {
  isSpeakingActive = speaking;
  speechListeners.forEach((fn) => {
    try {
      fn(speaking);
    } catch {
      // ignore
    }
  });
}

/**
 * Subscribe to speaking state updates (used for UI wave animation or mic suppression)
 */
export function onSpeakingChange(callback: (speaking: boolean) => void): () => void {
  speechListeners.add(callback);
  callback(isSpeakingActive);
  return () => {
    speechListeners.delete(callback);
  };
}

export function isCurrentlySpeaking(): boolean {
  return isSpeakingActive;
}

/**
 * Cache and select the most natural sounding English voice
 */
function updateBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Preferred list of high quality / natural neural voices
  const preferredVoiceNames = [
    'Google US English',
    'Google UK English Female',
    'Google UK English Male',
    'Samantha',
    'Karen',
    'Daniel',
    'Victoria',
    'Moira',
    'Tessa',
    'Microsoft Jenny Online (Natural)',
    'Microsoft Guy Online (Natural)',
    'Microsoft Aria Online (Natural)',
    'Microsoft Zira',
    'Microsoft David',
    'Alex',
    'Fred',
  ];

  for (const name of preferredVoiceNames) {
    const match = voices.find(
      (v) => v.name.toLowerCase().includes(name.toLowerCase()) && v.lang.startsWith('en')
    );
    if (match) {
      selectedVoice = match;
      return match;
    }
  }

  // Next: any natural or remote voice in English
  const naturalEn = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural'))
  );
  if (naturalEn) {
    selectedVoice = naturalEn;
    return naturalEn;
  }

  // Next: any US / GB English voice
  const anyEn = voices.find((v) => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB') || v.lang.startsWith('en'));
  if (anyEn) {
    selectedVoice = anyEn;
    return anyEn;
  }

  // Fallback to default
  const defaultVoice = voices.find((v) => v.default) || voices[0] || null;
  selectedVoice = defaultVoice;
  return defaultVoice;
}

// Attach listener to capture voices once loaded asynchronously
if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
  try {
    updateBestVoice();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          updateBestVoice();
        } catch {
          // ignore
        }
      };
    }
  } catch {
    // ignore
  }
}

/**
 * Clean up text for natural pronunciation (remove bracket tags, markdown symbols, formatting)
 */
function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[.*?\]/g, '') // remove bracket tags like [Spatial Interaction]
    .replace(/[`*_~#]/g, '') // remove markdown symbols
    .replace(/\s+/g, ' ') // collapse multi-spaces
    .trim();
}

/**
 * Cancel any ongoing speech synthesis immediately
 */
export function cancelSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
  notifySpeaking(false);
}

/**
 * Read aloud text response using Web Speech Synthesis
 */
export function speakText(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return;

  // Always cancel any in-progress speech before starting a new utterance to prevent overlaps
  cancelSpeech();

  try {
    const utterance = new SpeechSynthesisUtterance(cleaned);

    const voice = selectedVoice || updateBestVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'en-US';
    }

    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    utterance.onstart = () => {
      notifySpeaking(true);
      options?.onStart?.();
    };

    utterance.onend = () => {
      notifySpeaking(false);
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      notifySpeaking(false);
      options?.onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    notifySpeaking(false);
    options?.onError?.(err);
  }
}
