/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import type {
  AllRoomsState,
  OrbState,
  WeatherCondition,
  TranscriptMessage,
  PreferenceRule,
  RoutinePromptData,
  RoutineOption,
} from '../types';
import { matchAndExecuteCommand } from '../utils/commandMatcher';
import { speakText, cancelSpeech, onSpeakingChange, isCurrentlySpeaking } from '../utils/speech';
import { playWakeChime } from '../utils/audioEffects';
import {
  executeGoodnightRoutine,
  executeBathRoutine,
} from '../utils/routineRunner';

// Regex to capture "Hey KeepSafe" and close acoustic variants
const WAKE_WORD_REGEX = /(?:hey|ok|okay|hi|hello|yo)?\s*keep\s*safe/i;

interface UseWakeWordEngineProps {
  roomsState: AllRoomsState;
  setRoomsState: Dispatch<SetStateAction<AllRoomsState>>;
  preferences: PreferenceRule[];
  setPreferences: Dispatch<SetStateAction<PreferenceRule[]>>;
  transcriptHistory: TranscriptMessage[];
  setTranscriptHistory: Dispatch<SetStateAction<TranscriptMessage[]>>;
  currentWeather: WeatherCondition;
  onRequestRoutinePrompt?: (data: RoutinePromptData) => void;
}

export function useWakeWordEngine({
  roomsState,
  setRoomsState,
  preferences,
  setPreferences,
  transcriptHistory,
  setTranscriptHistory,
  currentWeather,
  onRequestRoutinePrompt,
}: UseWakeWordEngineProps) {
  // Widget Visibility & State
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastCommandResult, setLastCommandResult] = useState<string | null>(null);
  const [lastDeviceUpdates, setLastDeviceUpdates] = useState<Record<string, any> | null>(null);
  const [isListeningActive, setIsListeningActive] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [followUpCountdown, setFollowUpCountdown] = useState<number | null>(null);
  const [routinePromptData, setRoutinePromptData] = useState<RoutinePromptData | null>(null);
  const [isMicAvailable, setIsMicAvailable] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    checked: boolean;
    hasKey: boolean;
    missingVar?: string;
  }>({ checked: false, hasKey: true });

  // Internal references
  const recognitionRef = useRef<any>(null);
  const engineModeRef = useRef<'passive_wake_word' | 'active_command' | 'push_to_talk'>('passive_wake_word');
  const isDestroyedRef = useRef<boolean>(false);
  const followUpTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const currentAccumulatedTextRef = useRef<string>('');
  const pushToTalkBufferRef = useRef<string>('');
  const isSpeakingRef = useRef<boolean>(false);

  // Keep state refs in sync for event listeners without triggering effect teardown
  const roomsStateRef = useRef(roomsState);
  roomsStateRef.current = roomsState;
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const currentWeatherRef = useRef(currentWeather);
  currentWeatherRef.current = currentWeather;
  const transcriptHistoryRef = useRef(transcriptHistory);
  transcriptHistoryRef.current = transcriptHistory;

  // Check health endpoint for GEMINI_API_KEY status once on boot
  useEffect(() => {
    let isMounted = true;
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setApiKeyStatus({
            checked: true,
            hasKey: Boolean(data.hasApiKey),
            missingVar: data.hasApiKey ? undefined : 'GEMINI_API_KEY',
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          // If health check fails, we assume local fallback
          setApiKeyStatus({
            checked: true,
            hasKey: false,
            missingVar: 'GEMINI_API_KEY',
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Track speech synthesis speaking state
  useEffect(() => {
    const unsub = onSpeakingChange((speaking) => {
      isSpeakingRef.current = speaking;
    });
    return () => unsub();
  }, []);

  // Clear timers
  const clearFollowUp = useCallback(() => {
    if (followUpTimerRef.current) {
      clearInterval(followUpTimerRef.current);
      followUpTimerRef.current = null;
    }
    setFollowUpCountdown(null);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Start follow-up countdown (7 seconds)
  const startFollowUpCountdown = useCallback(() => {
    clearFollowUp();
    let timeLeft = 7;
    setFollowUpCountdown(timeLeft);
    setIsListeningActive(true);
    engineModeRef.current = 'active_command';

    followUpTimerRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearFollowUp();
        // Return to passive background wake-word listening
        setIsListeningActive(false);
        setIsWidgetOpen(false);
        setOrbState('idle');
        setInterimTranscript('');
        engineModeRef.current = 'passive_wake_word';
      } else {
        setFollowUpCountdown(timeLeft);
      }
    }, 1000);
  }, [clearFollowUp]);

  // Helper to speak response
  const speakResponse = useCallback((text: string) => {
    try {
      if (!text) return;
      speakText(text);
    } catch {
      // ignore
    }
  }, []);

  // Execute Spoken or Typed Command through Deterministic + Gemini Pipeline
  const processCommandText = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;

      clearFollowUp();
      clearSilenceTimer();
      setOrbState('thinking');
      setIsListeningActive(false);
      setIsPushToTalkActive(false);
      setInterimTranscript('');
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Log user message
      const userMsg: TranscriptMessage = {
        id: `msg-${Date.now()}-user`,
        sender: 'user',
        text,
        timestamp,
      };
      setTranscriptHistory((prev) => [...prev, userMsg]);

      // PATH 1: Deterministic Command Matching (Routines, Lights, Doors, HVAC, Preferences)
      const deterministic = matchAndExecuteCommand(text, roomsStateRef.current);

      if (deterministic.type === 'routine_direct') {
        setRoomsState(deterministic.nextState);
        setLastCommandResult(deterministic.logMessage);
        setLastDeviceUpdates(deterministic.appliedUpdates || null);
        const logMsg: TranscriptMessage = {
          id: `msg-${Date.now()}-routine`,
          sender: 'system',
          text: deterministic.logMessage,
          timestamp,
          type: 'routine',
          deviceUpdates: deterministic.appliedUpdates,
        };
        setTranscriptHistory((prev) => [...prev, logMsg]);
        speakResponse(deterministic.logMessage);
        setOrbState('idle');
        startFollowUpCountdown();
        return;
      }

      if (deterministic.type === 'routine_prompt') {
        setRoutinePromptData(deterministic.promptData);
        setLastCommandResult(
          deterministic.promptData.question ||
            deterministic.promptData.subText ||
            'Please choose a location.'
        );
        setLastDeviceUpdates(null);
        setOrbState('idle');
        if (onRequestRoutinePrompt) {
          onRequestRoutinePrompt(deterministic.promptData);
        }
        startFollowUpCountdown();
        return;
      }

      if (deterministic.type === 'command') {
        setRoomsState(deterministic.nextState);
        setLastCommandResult(deterministic.logMessage);
        setLastDeviceUpdates(deterministic.appliedUpdates || null);
        const aiMsg: TranscriptMessage = {
          id: `msg-${Date.now()}-cmd`,
          sender: 'ai',
          text: deterministic.logMessage,
          timestamp,
          type: 'command',
          deviceUpdates: deterministic.appliedUpdates,
        };
        setTranscriptHistory((prev) => [...prev, aiMsg]);
        speakResponse(deterministic.logMessage);
        setOrbState('idle');
        startFollowUpCountdown();
        return;
      }

      if (deterministic.type === 'preference') {
        const newPref: PreferenceRule = {
          ...deterministic.preference,
          enabled: true,
          createdAt: 'User Stated Rule',
        };
        setPreferences((prev) => [newPref, ...prev]);
        setLastCommandResult(deterministic.logMessage);
        setLastDeviceUpdates(null);
        const aiMsg: TranscriptMessage = {
          id: `msg-${Date.now()}-pref`,
          sender: 'ai',
          text: deterministic.logMessage,
          timestamp,
          type: 'preference',
        };
        setTranscriptHistory((prev) => [...prev, aiMsg]);
        speakResponse(deterministic.logMessage);
        setOrbState('idle');
        startFollowUpCountdown();
        return;
      }

      // PATH 2: Conversational Gemini API Call (with graceful Vercel & serverless fallback)
      let apiResult: any = null;
      let networkErrorNotice: string | null = null;

      try {
        const response = await fetch('/api/home-ai/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: text,
            currentState: roomsStateRef.current,
            preferences: preferencesRef.current,
            currentWeather: currentWeatherRef.current,
          }),
        });

        if (response.ok) {
          apiResult = await response.json();
        } else {
          networkErrorNotice = `Server responded with status ${response.status}`;
        }
      } catch (err: any) {
        networkErrorNotice = `API endpoint unreachable (${err?.message || 'network failure'})`;
      }

      if (apiResult) {
        // If server indicated missing key or fallback
        if (apiResult.apiKeyPresent === false) {
          setApiKeyStatus({
            checked: true,
            hasKey: false,
            missingVar: 'GEMINI_API_KEY',
          });
        }

        // Apply device updates if Gemini returned them
        if (apiResult.type === 'command' && apiResult.deviceUpdates) {
          setRoomsState((prev) => {
            const next = { ...prev };
            for (const [roomKey, roomUpdates] of Object.entries(apiResult.deviceUpdates)) {
              if (next[roomKey as keyof AllRoomsState]) {
                next[roomKey as keyof AllRoomsState] = {
                  ...next[roomKey as keyof AllRoomsState],
                  ...(roomUpdates as object),
                } as any;
              }
            }
            return next;
          });
          setLastDeviceUpdates(apiResult.deviceUpdates);
        } else {
          setLastDeviceUpdates(null);
        }

        const msgText = apiResult.message || "I'm monitoring your home systems.";
        setLastCommandResult(msgText);

        const aiMsg: TranscriptMessage = {
          id: `msg-${Date.now()}-ai`,
          sender: 'ai',
          text: msgText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: apiResult.type || 'chat',
          deviceUpdates: apiResult.deviceUpdates,
        };
        setTranscriptHistory((prev) => [...prev, aiMsg]);
        speakResponse(msgText);
      } else {
        // Fallback to local response when server/network is down
        const fallbackMsg = `[Local Engine] Processed: "${text}". (${networkErrorNotice || 'Gemini API not configured'})`;
        setLastCommandResult(fallbackMsg);
        setLastDeviceUpdates(null);
        const aiMsg: TranscriptMessage = {
          id: `msg-${Date.now()}-ai-fallback`,
          sender: 'ai',
          text: `I've registered your request locally. Note: Configure GEMINI_API_KEY in Vercel Project Settings for full generative AI responses.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'chat',
        };
        setTranscriptHistory((prev) => [...prev, aiMsg]);
        speakResponse(`Registered request locally.`);
      }

      setOrbState('idle');
      startFollowUpCountdown();
    },
    [
      setRoomsState,
      setPreferences,
      setTranscriptHistory,
      speakResponse,
      startFollowUpCountdown,
      clearFollowUp,
      clearSilenceTimer,
      onRequestRoutinePrompt,
    ]
  );

  // Store processCommandText in a ref so listeners always have latest reference
  const processCommandTextRef = useRef(processCommandText);
  processCommandTextRef.current = processCommandText;

  // Trigger wake word action
  const handleWakeWordDetected = useCallback(
    (trailingCommand?: string) => {
      playWakeChime();
      setIsWidgetOpen(true);
      clearFollowUp();
      setRoutinePromptData(null);
      setSpeechError(null);

      if (trailingCommand && trailingCommand.trim().length > 1) {
        setInterimTranscript(trailingCommand.trim());
        processCommandTextRef.current(trailingCommand.trim());
      } else {
        engineModeRef.current = 'active_command';
        setIsListeningActive(true);
        setOrbState('listening');
        setInterimTranscript('');
        currentAccumulatedTextRef.current = '';
      }
    },
    [clearFollowUp]
  );

  const handleWakeWordDetectedRef = useRef(handleWakeWordDetected);
  handleWakeWordDetectedRef.current = handleWakeWordDetected;

  // Push-to-Talk Handlers (used across the entire application)
  const startPushToTalk = useCallback(() => {
    cancelSpeech();
    clearFollowUp();
    clearSilenceTimer();
    setSpeechError(null);
    setIsPushToTalkActive(true);
    setOrbState('listening');
    setInterimTranscript('');
    pushToTalkBufferRef.current = '';
    engineModeRef.current = 'push_to_talk';

    // Ensure recognition is active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        // Recognition already running
      }
    }
  }, [clearFollowUp, clearSilenceTimer]);

  const stopPushToTalk = useCallback(() => {
    setIsPushToTalkActive(false);

    setTimeout(() => {
      const recorded = pushToTalkBufferRef.current.trim();
      engineModeRef.current = 'passive_wake_word';

      if (recorded.length > 0) {
        processCommandTextRef.current(recorded);
      } else {
        setOrbState('idle');
        setInterimTranscript('');
        setSpeechError('No speech detected. Hold the button while speaking, or type a command.');
        setTimeout(() => setSpeechError(null), 4000);
      }
    }, 250);
  }, []);

  // Close floating widget manually
  const closeWidget = useCallback(() => {
    clearFollowUp();
    clearSilenceTimer();
    setIsWidgetOpen(false);
    setIsListeningActive(false);
    setOrbState('idle');
    setInterimTranscript('');
    setRoutinePromptData(null);
    engineModeRef.current = 'passive_wake_word';
  }, [clearFollowUp, clearSilenceTimer]);

  // Handle routine option selection in floating widget
  const handleSelectRoutineOption = useCallback(
    (option: RoutineOption) => {
      if (!routinePromptData) return;
      const routineId = routinePromptData.routineId;
      let result;
      if (routineId === 'goodnight') {
        result = executeGoodnightRoutine(
          roomsStateRef.current,
          option.roomKey as keyof AllRoomsState,
          option.label
        );
      } else {
        result = executeBathRoutine(
          roomsStateRef.current,
          option.roomKey as keyof AllRoomsState,
          option.label
        );
      }
      setRoomsState(result.nextState);
      setLastCommandResult(result.logMessage);
      setLastDeviceUpdates(result.appliedUpdates || null);
      setRoutinePromptData(null);

      const logMsg: TranscriptMessage = {
        id: `msg-${Date.now()}-routine-${routineId}`,
        sender: 'system',
        text: result.logMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'routine',
        deviceUpdates: result.appliedUpdates,
      };
      setTranscriptHistory((prev) => [...prev, logMsg]);
      speakResponse(result.logMessage);
      startFollowUpCountdown();
    },
    [routinePromptData, setRoomsState, setTranscriptHistory, speakResponse, startFollowUpCountdown]
  );

  // Toggle active listening manually
  const toggleMic = useCallback(() => {
    if (isListeningActive) {
      if (currentAccumulatedTextRef.current.trim()) {
        processCommandTextRef.current(currentAccumulatedTextRef.current.trim());
      } else {
        setIsListeningActive(false);
        setOrbState('idle');
        engineModeRef.current = 'passive_wake_word';
      }
    } else {
      cancelSpeech();
      clearFollowUp();
      setIsListeningActive(true);
      setOrbState('listening');
      setInterimTranscript('');
      currentAccumulatedTextRef.current = '';
      engineModeRef.current = 'active_command';
    }
  }, [isListeningActive, clearFollowUp]);

  // =========================================================================
  // CONTINUOUS TOP-LEVEL SPEECH RECOGNITION INSTANCE (Mounted Once at App Root)
  // =========================================================================
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsMicAvailable(false);
      setSpeechError('Web Speech API is not supported in this browser. You can type commands below.');
      return;
    }

    isDestroyedRef.current = false;
    let recognition: any = null;

    const startListeningSafely = () => {
      if (isDestroyedRef.current || !recognition) return;
      try {
        recognition.start();
      } catch (err: any) {
        // Recognition already started or starting
      }
    };

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsMicAvailable(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        // Echo cancellation / voice suppression: ignore mic input while AI is speaking
        if (isSpeakingRef.current || isCurrentlySpeaking()) {
          return;
        }

        let fullInterim = '';
        let fullFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            fullFinal += piece + ' ';
          } else {
            fullInterim += piece;
          }
        }

        const currentCombined = (fullFinal || fullInterim).trim();
        if (!currentCombined) return;

        // MODE 1: PASSIVE BACKGROUND WAKE WORD LISTENING ("Hey KeepSafe")
        if (engineModeRef.current === 'passive_wake_word') {
          const match = currentCombined.match(WAKE_WORD_REGEX);
          if (match && match.index !== undefined) {
            const afterWakeWord = currentCombined.slice(match.index + match[0].length).trim();
            handleWakeWordDetectedRef.current(afterWakeWord);
          }
          return;
        }

        // MODE 2: ACTIVE COMMAND LISTENING (In floating widget or after wake-word)
        if (engineModeRef.current === 'active_command') {
          const cleanText = currentCombined.replace(WAKE_WORD_REGEX, '').trim();
          const textToUse = cleanText || currentCombined;
          currentAccumulatedTextRef.current = textToUse;
          setInterimTranscript(textToUse);
          setOrbState('listening');
          clearFollowUp();

          // Reset silence timer: when user stops speaking for 1.3s, auto-process
          clearSilenceTimer();
          silenceTimerRef.current = setTimeout(() => {
            const spoken = currentAccumulatedTextRef.current.trim();
            if (spoken.length > 0) {
              processCommandTextRef.current(spoken);
            }
          }, 1300);
          return;
        }

        // MODE 3: PUSH-TO-TALK LISTENING (User holding push-to-talk button)
        if (engineModeRef.current === 'push_to_talk') {
          const cleanText = currentCombined.replace(WAKE_WORD_REGEX, '').trim();
          const textToUse = cleanText || currentCombined;
          pushToTalkBufferRef.current = textToUse;
          setInterimTranscript(textToUse);
          setOrbState('listening');
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsMicAvailable(false);
          setSpeechError('Microphone access blocked. Please allow microphone permissions in your browser.');
          isDestroyedRef.current = true;
          return;
        }
        // Non-fatal errors like 'no-speech', 'aborted', 'audio-capture', 'network'
        // will trigger onend, which handles clean continuous restart
      };

      recognition.onend = () => {
        // Continuous listening auto-restart with debounced delay
        if (!isDestroyedRef.current) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
          }
          restartTimeoutRef.current = setTimeout(() => {
            startListeningSafely();
          }, 200);
        }
      };

      recognitionRef.current = recognition;
      startListeningSafely();
    } catch (e) {
      console.warn('KeepSafe SpeechRecognition initialization error:', e);
      setIsMicAvailable(false);
    }

    // Page Visibility listener: resume listening when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isDestroyedRef.current) {
        startListeningSafely();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDestroyedRef.current = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [clearFollowUp, clearSilenceTimer]);

  return {
    isWidgetOpen,
    openWidget: () => handleWakeWordDetected(),
    closeWidget,
    orbState,
    interimTranscript,
    lastCommandResult,
    lastDeviceUpdates,
    isListeningActive,
    isPushToTalkActive,
    followUpCountdown,
    routinePromptData,
    isMicAvailable,
    speechError,
    apiKeyStatus,
    handleSelectRoutineOption,
    processCommandText,
    toggleMic,
    startPushToTalk,
    stopPushToTalk,
  };
}

