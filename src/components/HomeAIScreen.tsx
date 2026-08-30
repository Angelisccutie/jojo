/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Mic,
  Send,
  Sparkles,
  CloudRain,
  Sun,
  Snowflake,
  Moon,
  Bath,
  LogOut,
  LogIn,
  Sliders,
  Bot,
  Layers,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  AlertCircle,
  Box,
  Compass,
} from 'lucide-react';
import { VoiceOrb } from './VoiceOrb';
import { ChatTranscript } from './ChatTranscript';
import { PreferencesPanel } from './PreferencesPanel';
import { LiveDeviceMonitor } from './LiveDeviceMonitor';
import { House3DViewer } from './HouseScene/House3DViewer';
import type { WeatherPromptData } from './WeatherConfirmationModal';
import {
  GOODNIGHT_ROOM_OPTIONS,
  BATH_ROOM_OPTIONS,
  executeGoodnightRoutine,
  executeBathRoutine,
  executeLeavingHomeRoutine,
  executeEnteringHomeRoutine,
} from '../utils/routineRunner';
import { matchAndExecuteCommand } from '../utils/commandMatcher';
import {
  speakText,
  cancelSpeech,
  onSpeakingChange,
  isCurrentlySpeaking,
} from '../utils/speech';
import type {
  AllRoomsState,
  OrbState,
  WeatherCondition,
  TranscriptMessage,
  PreferenceRule,
  RoutinePromptData,
  RoutineOption,
} from '../types';

interface HomeAIScreenProps {
  onBack: () => void;
  roomsState: AllRoomsState;
  setRoomsState: Dispatch<SetStateAction<AllRoomsState>>;
  preferences: PreferenceRule[];
  setPreferences: Dispatch<SetStateAction<PreferenceRule[]>>;
  transcriptHistory: TranscriptMessage[];
  setTranscriptHistory: Dispatch<SetStateAction<TranscriptMessage[]>>;
  currentWeather: WeatherCondition;
  setCurrentWeather: Dispatch<SetStateAction<WeatherCondition>>;
  onRequestWeatherConfirmation?: (data: WeatherPromptData) => void;
  onRequestRoutinePrompt?: (data: RoutinePromptData) => void;
  startPushToTalk?: () => void;
  stopPushToTalk?: () => void;
  isPushToTalkActive?: boolean;
  orbState?: OrbState;
  interimTranscript?: string;
  speechError?: string | null;
  apiKeyStatus?: { checked: boolean; hasKey: boolean; missingVar?: string };
  processCommandText?: (text: string) => Promise<void>;
}

export function HomeAIScreen({
  onBack,
  roomsState,
  setRoomsState,
  preferences,
  setPreferences,
  transcriptHistory,
  setTranscriptHistory,
  currentWeather,
  setCurrentWeather,
  onRequestWeatherConfirmation,
  onRequestRoutinePrompt,
  startPushToTalk: parentStartPushToTalk,
  stopPushToTalk: parentStopPushToTalk,
  isPushToTalkActive: parentIsPushToTalkActive,
  orbState: parentOrbState,
  interimTranscript: parentInterimTranscript,
  speechError: parentSpeechError,
  apiKeyStatus,
  processCommandText: parentProcessCommandText,
}: HomeAIScreenProps) {
  const [activeTab, setActiveTab] = useState<'spatial' | 'voice' | 'preferences'>('spatial');
  const [localOrbState, setLocalOrbState] = useState<OrbState>('idle');
  const [localIsPressed, setLocalIsPressed] = useState(false);
  const [localInterimTranscript, setLocalInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [localSpeechError, setLocalSpeechError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [weatherTriggerNotice, setWeatherTriggerNotice] = useState<string | null>(null);

  const effectiveOrbState = parentOrbState ?? localOrbState;
  const effectiveIsPressed = parentIsPushToTalkActive ?? localIsPressed;
  const effectiveInterim = parentInterimTranscript ?? localInterimTranscript;
  const effectiveSpeechError = parentSpeechError ?? localSpeechError;

  // Track speaking state
  useEffect(() => {
    const unsubscribe = onSpeakingChange(setIsSpeaking);
    return () => {
      unsubscribe();
      cancelSpeech();
    };
  }, []);

  // Helper to speak AI responses if TTS is turned on
  const speakResponse = (text: string) => {
    try {
      if (!ttsEnabled || !text) return;
      speakText(text);
    } catch (e) {
      console.warn('TTS voice output non-blocking error:', e);
    }
  };

  // Process user transcript: Path 1 (Deterministic) -> Path 2 (Conversational Gemini)
  const processTranscript = async (rawText: string) => {
    if (parentProcessCommandText) {
      await parentProcessCommandText(rawText);
      return;
    }

    const text = rawText.trim();
    if (!text) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Append user message to transcript log
    const userMsg: TranscriptMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text,
      timestamp,
    };
    setTranscriptHistory((prev) => [...prev, userMsg]);
    setLocalInterimTranscript('');

    // =========================================================================
    // PATH 1 — DETERMINISTIC COMMAND MATCHING (runs FIRST, before any Gemini call)
    // =========================================================================
    const deterministic = matchAndExecuteCommand(text, roomsState);

    if (deterministic.type === 'routine_direct') {
      setRoomsState(deterministic.nextState);
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
      setLocalOrbState('idle');
      return;
    }

    if (deterministic.type === 'routine_prompt') {
      if (onRequestRoutinePrompt) {
        onRequestRoutinePrompt({
          ...deterministic.promptData,
          onSelectOption: (option: RoutineOption) => {
            const routineId = deterministic.promptData.routineId;
            let result;
            if (routineId === 'goodnight') {
              result = executeGoodnightRoutine(
                roomsState,
                option.roomKey as keyof AllRoomsState,
                option.label
              );
            } else {
              result = executeBathRoutine(
                roomsState,
                option.roomKey as keyof AllRoomsState,
                option.label
              );
            }
            setRoomsState(result.nextState);
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
          },
          onCancel: () => {},
        });
      }
      setLocalOrbState('idle');
      return;
    }

    if (deterministic.type === 'command') {
      setRoomsState(deterministic.nextState);
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
      setLocalOrbState('idle');
      return;
    }

    if (deterministic.type === 'preference') {
      const newPref: PreferenceRule = {
        ...deterministic.preference,
        enabled: true,
        createdAt: 'User Stated Rule',
      };
      setPreferences((prev) => [newPref, ...prev]);

      const aiMsg: TranscriptMessage = {
        id: `msg-${Date.now()}-pref`,
        sender: 'ai',
        text: deterministic.logMessage,
        timestamp,
        type: 'preference',
      };
      setTranscriptHistory((prev) => [...prev, aiMsg]);
      speakResponse(deterministic.logMessage);
      setLocalOrbState('idle');
      return;
    }

    // =========================================================================
    // PATH 2 — GEMINI FOR GENERAL CONVERSATION (fallback only for open chat)
    // =========================================================================
    setLocalOrbState('thinking');

    try {
      const response = await fetch('/api/home-ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          currentState: roomsState,
          preferences,
          currentWeather,
        }),
      });

      const data = await response.json();
      const aiMsgTimestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const aiMsg: TranscriptMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        text: data.message || "I'm listening and monitoring your home systems.",
        timestamp: aiMsgTimestamp,
        type: 'chat',
      };
      setTranscriptHistory((prev) => [...prev, aiMsg]);
      speakResponse(aiMsg.text);
    } catch (err: any) {
      console.warn('Home AI conversational processing fallback:', err);
      const aiErrMsg: TranscriptMessage = {
        id: `msg-${Date.now()}-local`,
        sender: 'ai',
        text: `Processed locally: "${text}". (Note: Add GEMINI_API_KEY to Vercel Project Settings for live generative responses)`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'chat',
      };
      setTranscriptHistory((prev) => [...prev, aiErrMsg]);
    } finally {
      setLocalOrbState('idle');
    }
  };

  // Push-to-Talk Event Handlers
  const handleStartListening = () => {
    if (parentStartPushToTalk) {
      parentStartPushToTalk();
      return;
    }
    cancelSpeech();
    setLocalIsPressed(true);
    setLocalSpeechError(null);
    setLocalInterimTranscript('');
    setLocalOrbState('listening');
  };

  const handleStopListening = () => {
    if (parentStopPushToTalk) {
      parentStopPushToTalk();
      return;
    }
    setLocalIsPressed(false);
    setLocalOrbState('idle');
  };

  // Handle weather change simulation with One-Time Confirmation rules
  const handleWeatherChange = (newWeather: WeatherCondition) => {
    if (newWeather === currentWeather) return;
    setCurrentWeather(newWeather);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. RAIN EVENT
    if (newWeather === 'rainy') {
      const existingRainRule = preferences.find((pref) => {
        const c = pref.condition.toLowerCase();
        const d = pref.conditionDescription.toLowerCase();
        const r = pref.ruleText.toLowerCase();
        return (
          pref.id === 'weather-safety-rain' ||
          (pref.isWeatherSafetyRule && c === 'rainy') ||
          c === 'rainy' ||
          c.includes('rain') ||
          d.includes('rain') ||
          r.includes('rain')
        );
      });

      if (existingRainRule) {
        // A preference already exists (either confirmed one-time safety rule or user-stated rule)
        if (existingRainRule.enabled === false) {
          // Firm "No" decision previously saved — do nothing silently
          return;
        }

        // Apply saved action (close doors & windows)
        const updates =
          existingRainRule.deviceUpdates && Object.keys(existingRainRule.deviceUpdates).length > 0
            ? existingRainRule.deviceUpdates
            : {
                livingRoom: { mainDoorOpen: false },
                kitchen: { windowOpen: false },
                garage: { garageDoorOpen: false },
              };

        setRoomsState((prev) => {
          const next = { ...prev };
          for (const [roomKey, roomUpdates] of Object.entries(updates)) {
            if (next[roomKey as keyof AllRoomsState]) {
              next[roomKey as keyof AllRoomsState] = {
                ...next[roomKey as keyof AllRoomsState],
                ...(roomUpdates as object),
              } as any;
            }
          }
          return next;
        });

        const logMsg: TranscriptMessage = {
          id: `msg-${Date.now()}-weather-rain`,
          sender: 'system',
          text: 'Rainy weather — closed doors and windows per your saved preference.',
          timestamp,
          type: 'weather_trigger',
          deviceUpdates: updates,
        };
        setTranscriptHistory((prev) => [...prev, logMsg]);
        speakResponse('Rainy weather — closed doors and windows per your saved preference.');
        setWeatherTriggerNotice('Rainy weather — closed doors and windows per your saved preference.');
        setTimeout(() => setWeatherTriggerNotice(null), 5000);
      } else {
        // First time weather changed to rainy & no rule answered yet -> trigger one-time confirmation prompt
        if (onRequestWeatherConfirmation) {
          onRequestWeatherConfirmation({
            weather: 'rainy',
            promptText: "It's raining — should I close all doors and windows?",
            confirmLabel: 'Yes, always do this',
            declineLabel: "No, don't do this",
            onConfirm: () => {
              const rainUpdates = {
                livingRoom: { mainDoorOpen: false },
                kitchen: { windowOpen: false },
                garage: { garageDoorOpen: false },
              };

              setRoomsState((prev) => ({
                ...prev,
                livingRoom: { ...prev.livingRoom, mainDoorOpen: false },
                kitchen: { ...prev.kitchen, windowOpen: false },
                garage: { ...prev.garage, garageDoorOpen: false },
              }));

              const confirmedRule: PreferenceRule = {
                id: 'weather-safety-rain',
                ruleText: 'Auto-close doors/windows when raining',
                condition: 'rainy',
                conditionDescription: 'Rain / Severe precipitation',
                summary: 'Auto-close doors/windows when raining: Enabled',
                deviceUpdates: rainUpdates,
                enabled: true,
                isWeatherSafetyRule: true,
                createdAt: 'Safety Decision',
              };
              setPreferences((prev) => [confirmedRule, ...prev.filter((p) => p.id !== 'weather-safety-rain')]);

              const confirmMsg: TranscriptMessage = {
                id: `msg-${Date.now()}-rain-confirm`,
                sender: 'system',
                text: 'Rainy weather — closed doors and windows per your saved preference.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'weather_trigger',
                deviceUpdates: rainUpdates,
              };
              setTranscriptHistory((prev) => [...prev, confirmMsg]);
              speakResponse('Closed all doors and windows and saved your preference for future rain events.');
              setWeatherTriggerNotice('Closed doors & windows — rain safety rule enabled.');
              setTimeout(() => setWeatherTriggerNotice(null), 5000);
            },
            onDecline: () => {
              const declinedRule: PreferenceRule = {
                id: 'weather-safety-rain',
                ruleText: 'Auto-close doors/windows when raining',
                condition: 'rainy',
                conditionDescription: 'Rain / Severe precipitation',
                summary: 'Auto-close doors/windows when raining: Disabled',
                deviceUpdates: {
                  livingRoom: { mainDoorOpen: false },
                  kitchen: { windowOpen: false },
                  garage: { garageDoorOpen: false },
                },
                enabled: false,
                isWeatherSafetyRule: true,
                createdAt: 'Safety Decision',
              };
              setPreferences((prev) => [declinedRule, ...prev.filter((p) => p.id !== 'weather-safety-rain')]);

              const declineMsg: TranscriptMessage = {
                id: `msg-${Date.now()}-rain-decline`,
                sender: 'system',
                text: 'Rain safety rule saved as Disabled — doors and windows will remain unchanged during rain.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'weather_trigger',
              };
              setTranscriptHistory((prev) => [...prev, declineMsg]);
            },
          });
        }
      }
      return;
    }

    // 2. WINTER EVENT
    if (newWeather === 'winter') {
      const existingWinterRule = preferences.find((pref) => {
        const c = pref.condition.toLowerCase();
        const d = pref.conditionDescription.toLowerCase();
        const r = pref.ruleText.toLowerCase();
        return (
          pref.id === 'weather-safety-winter' ||
          (pref.isWeatherSafetyRule && c === 'winter') ||
          c === 'winter' ||
          c.includes('winter') ||
          d.includes('winter') ||
          d.includes('cold') ||
          r.includes('winter') ||
          r.includes('cold')
        );
      });

      if (existingWinterRule) {
        if (existingWinterRule.enabled === false) {
          // Firm "No" decision previously saved — do nothing silently
          return;
        }

        const updates =
          existingWinterRule.deviceUpdates && Object.keys(existingWinterRule.deviceUpdates).length > 0
            ? existingWinterRule.deviceUpdates
            : {
                livingRoom: { acPower: false, fanMode: 'low', fanSpeed: 20, mainDoorOpen: false },
                bedroomMain: { acPower: false },
                bedroom2: { acPower: false, fanMode: 'low', fanSpeed: 20 },
                bedroom3: { acPower: false },
                diningRoom: { acPower: false },
                kitchen: { windowOpen: false },
                garage: { garageDoorOpen: false },
              };

        setRoomsState((prev) => {
          const next = { ...prev };
          for (const [roomKey, roomUpdates] of Object.entries(updates)) {
            if (next[roomKey as keyof AllRoomsState]) {
              next[roomKey as keyof AllRoomsState] = {
                ...next[roomKey as keyof AllRoomsState],
                ...(roomUpdates as object),
              } as any;
            }
          }
          return next;
        });

        const logMsg: TranscriptMessage = {
          id: `msg-${Date.now()}-weather-winter`,
          sender: 'system',
          text: 'Winter weather — AC turned off, fans lowered, and doors/windows closed per saved preference.',
          timestamp,
          type: 'weather_trigger',
          deviceUpdates: updates,
        };
        setTranscriptHistory((prev) => [...prev, logMsg]);
        speakResponse('Winter weather — AC turned off, fans lowered, and doors and windows closed per saved preference.');
        setWeatherTriggerNotice('Winter weather — AC turned off, fans lowered, and doors/windows closed.');
        setTimeout(() => setWeatherTriggerNotice(null), 5000);
      } else {
        // First time weather changed to winter & no rule answered yet -> trigger one-time confirmation prompt
        if (onRequestWeatherConfirmation) {
          onRequestWeatherConfirmation({
            weather: 'winter',
            promptText: "It's winter — should I turn off the AC, lower fan speed, and close doors and windows?",
            confirmLabel: 'Yes, always do this',
            declineLabel: "No, don't do this",
            onConfirm: () => {
              const winterUpdates = {
                livingRoom: { acPower: false, fanMode: 'low' as const, fanSpeed: 20, mainDoorOpen: false },
                bedroomMain: { acPower: false },
                bedroom2: { acPower: false, fanMode: 'low' as const, fanSpeed: 20 },
                bedroom3: { acPower: false },
                diningRoom: { acPower: false },
                kitchen: { windowOpen: false },
                garage: { garageDoorOpen: false },
              };

              setRoomsState((prev) => ({
                ...prev,
                livingRoom: { ...prev.livingRoom, acPower: false, fanMode: 'low', fanSpeed: 20, mainDoorOpen: false },
                bedroomMain: { ...prev.bedroomMain, acPower: false },
                bedroom2: { ...prev.bedroom2, acPower: false, fanMode: 'low', fanSpeed: 20 },
                bedroom3: { ...prev.bedroom3, acPower: false },
                diningRoom: { ...prev.diningRoom, acPower: false },
                kitchen: { ...prev.kitchen, windowOpen: false },
                garage: { ...prev.garage, garageDoorOpen: false },
              }));

              const confirmedRule: PreferenceRule = {
                id: 'weather-safety-winter',
                ruleText: 'Winter weather protection (AC off, fan low, close doors/windows)',
                condition: 'winter',
                conditionDescription: 'Winter / Freezing climate',
                summary: 'Winter weather protection (AC off, fan low, seal home): Enabled',
                deviceUpdates: winterUpdates,
                enabled: true,
                isWeatherSafetyRule: true,
                createdAt: 'Safety Decision',
              };
              setPreferences((prev) => [confirmedRule, ...prev.filter((p) => p.id !== 'weather-safety-winter')]);

              const confirmMsg: TranscriptMessage = {
                id: `msg-${Date.now()}-winter-confirm`,
                sender: 'system',
                text: 'Winter weather — AC turned off, fans lowered, and doors/windows closed per saved preference.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'weather_trigger',
                deviceUpdates: winterUpdates,
              };
              setTranscriptHistory((prev) => [...prev, confirmMsg]);
              speakResponse('Turned off AC, lowered fans, closed doors and windows, and saved this preference.');
              setWeatherTriggerNotice('Winter protection active — AC off, fans low, doors/windows closed.');
              setTimeout(() => setWeatherTriggerNotice(null), 5000);
            },
            onDecline: () => {
              const declinedRule: PreferenceRule = {
                id: 'weather-safety-winter',
                ruleText: 'Winter weather protection (AC off, fan low, close doors/windows)',
                condition: 'winter',
                conditionDescription: 'Winter / Freezing climate',
                summary: 'Winter weather protection (AC off, fan low, seal home): Disabled',
                deviceUpdates: {
                  livingRoom: { acPower: false, fanMode: 'low', fanSpeed: 20, mainDoorOpen: false },
                  bedroomMain: { acPower: false },
                  bedroom2: { acPower: false, fanMode: 'low', fanSpeed: 20 },
                  bedroom3: { acPower: false },
                  diningRoom: { acPower: false },
                  kitchen: { windowOpen: false },
                  garage: { garageDoorOpen: false },
                },
                enabled: false,
                isWeatherSafetyRule: true,
                createdAt: 'Safety Decision',
              };
              setPreferences((prev) => [declinedRule, ...prev.filter((p) => p.id !== 'weather-safety-winter')]);

              const declineMsg: TranscriptMessage = {
                id: `msg-${Date.now()}-winter-decline`,
                sender: 'system',
                text: 'Winter climate rule saved as Disabled — KeepSafe will not change HVAC, fans, or doors/windows during winter.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'weather_trigger',
              };
              setTranscriptHistory((prev) => [...prev, declineMsg]);
            },
          });
        }
      }
      return;
    }

    // 3. SUNNY & NIGHT (No confirmation prompt needed)
    const matchingRules = preferences.filter((pref) => {
      const condition = pref.condition.toLowerCase();
      const desc = pref.conditionDescription.toLowerCase();
      const target = newWeather.toLowerCase();
      return (
        pref.enabled !== false &&
        (condition === target || desc.includes(target))
      );
    });

    if (matchingRules.length > 0) {
      let mergedUpdates: Record<string, any> = {};
      matchingRules.forEach((rule) => {
        mergedUpdates = { ...mergedUpdates, ...rule.deviceUpdates };
      });

      setRoomsState((prev) => {
        const next = { ...prev };
        for (const [roomKey, roomUpdates] of Object.entries(mergedUpdates)) {
          if (next[roomKey as keyof AllRoomsState]) {
            next[roomKey as keyof AllRoomsState] = {
              ...next[roomKey as keyof AllRoomsState],
              ...(roomUpdates as object),
            } as any;
          }
        }
        return next;
      });

      const notificationText =
        newWeather === 'sunny'
          ? "It's sunny outside — daytime cooling rules applied."
          : `Weather changed to ${newWeather} — applied ${matchingRules.length} saved rule(s).`;

      const systemMsg: TranscriptMessage = {
        id: `msg-${Date.now()}-system`,
        sender: 'system',
        text: notificationText,
        timestamp,
        type: 'weather_trigger',
        deviceUpdates: mergedUpdates,
      };
      setTranscriptHistory((prev) => [...prev, systemMsg]);
      speakResponse(notificationText);
      setWeatherTriggerNotice(notificationText);
      setTimeout(() => setWeatherTriggerNotice(null), 5000);
    }
  };

  const handleTriggerPreference = (rule: PreferenceRule) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRoomsState((prev) => {
      const next = { ...prev };
      for (const [roomKey, roomUpdates] of Object.entries(rule.deviceUpdates)) {
        if (next[roomKey as keyof AllRoomsState]) {
          next[roomKey as keyof AllRoomsState] = {
            ...next[roomKey as keyof AllRoomsState],
            ...(roomUpdates as object),
          } as any;
        }
      }
      return next;
    });

    const triggerMsg: TranscriptMessage = {
      id: `msg-${Date.now()}-pref-manual`,
      sender: 'system',
      text: `Manual Automation Trigger: Applied rule "${rule.ruleText}".`,
      timestamp,
      type: 'weather_trigger',
      deviceUpdates: rule.deviceUpdates,
    };
    setTranscriptHistory((prev) => [...prev, triggerMsg]);
    speakResponse(`Executed rule: ${rule.ruleText}`);
  };

  const handleTogglePreference = (id: string) => {
    setPreferences((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextEnabled = p.enabled === false ? true : false;
          let nextSummary = p.summary;
          if (nextSummary.includes(': Enabled')) {
            nextSummary = nextSummary.replace(': Enabled', ': Disabled');
          } else if (nextSummary.includes(': Disabled')) {
            nextSummary = nextSummary.replace(': Disabled', ': Enabled');
          } else {
            nextSummary = `${nextSummary} (${nextEnabled ? 'Enabled' : 'Disabled'})`;
          }
          return {
            ...p,
            enabled: nextEnabled,
            summary: nextSummary,
          };
        }
        return p;
      })
    );
  };

  const handleRemovePreference = (id: string) => {
    setPreferences((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddSampleRule = (rule: Omit<PreferenceRule, 'id' | 'createdAt'>) => {
    const newPref: PreferenceRule = {
      ...rule,
      id: `pref-${Date.now()}`,
      enabled: true,
      createdAt: 'Custom Preset',
    };
    setPreferences((prev) => [newPref, ...prev]);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const aiMsg: TranscriptMessage = {
      id: `msg-${Date.now()}-ai-sample`,
      sender: 'ai',
      text: `Added new automation recipe: "${newPref.ruleText}".`,
      timestamp,
      type: 'preference',
    };
    setTranscriptHistory((prev) => [...prev, aiMsg]);
  };

  const handleSamplePrompt = (prompt: string) => {
    processTranscript(prompt);
  };

  const triggerGoodnightDirect = () => {
    console.log('Goodnight routine triggered — awaiting room selection');
    if (onRequestRoutinePrompt) {
      onRequestRoutinePrompt({
        routineId: 'goodnight',
        title: 'Goodnight Routine',
        question: 'Where are you sleeping tonight?',
        subText:
          'Sets selected room AC to energy-saving eco mode (74°F) and turns off all other electronic devices across the house.',
        options: GOODNIGHT_ROOM_OPTIONS,
        onSelectOption: (option: RoutineOption) => {
          const result = executeGoodnightRoutine(
            roomsState,
            option.roomKey as keyof AllRoomsState,
            option.label
          );
          setRoomsState(result.nextState);
          const logMsg: TranscriptMessage = {
            id: `msg-${Date.now()}-routine-goodnight`,
            sender: 'system',
            text: result.logMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'routine',
            deviceUpdates: result.appliedUpdates,
          };
          setTranscriptHistory((prev) => [...prev, logMsg]);
          speakResponse(result.logMessage);
        },
        onCancel: () => {},
      });
    }
  };

  const triggerBathDirect = () => {
    console.log('Bath Time routine triggered — awaiting room selection');
    if (onRequestRoutinePrompt) {
      onRequestRoutinePrompt({
        routineId: 'bath_time',
        title: 'Bath Time Routine',
        question: 'Which bathroom are you using?',
        subText:
          'Turns on the selected bathroom light and powers down all other devices across the entire house.',
        options: BATH_ROOM_OPTIONS,
        onSelectOption: (option: RoutineOption) => {
          const result = executeBathRoutine(
            roomsState,
            option.roomKey as keyof AllRoomsState,
            option.label
          );
          setRoomsState(result.nextState);
          const logMsg: TranscriptMessage = {
            id: `msg-${Date.now()}-routine-bath`,
            sender: 'system',
            text: result.logMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'routine',
            deviceUpdates: result.appliedUpdates,
          };
          setTranscriptHistory((prev) => [...prev, logMsg]);
          speakResponse(result.logMessage);
        },
        onCancel: () => {},
      });
    }
  };

  const triggerLeavingDirect = () => {
    console.log('Leaving Home routine triggered — executing shutdown and secure');
    const result = executeLeavingHomeRoutine(roomsState);
    setRoomsState(result.nextState);
    const logMsg: TranscriptMessage = {
      id: `msg-${Date.now()}-routine-leaving`,
      sender: 'system',
      text: result.logMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'routine',
      deviceUpdates: result.appliedUpdates,
    };
    setTranscriptHistory((prev) => [...prev, logMsg]);
    speakResponse(result.logMessage);
  };

  const triggerEnteringDirect = () => {
    console.log('Entering Home routine triggered — executing welcome profile');
    const result = executeEnteringHomeRoutine(roomsState);
    setRoomsState(result.nextState);
    const logMsg: TranscriptMessage = {
      id: `msg-${Date.now()}-routine-entering`,
      sender: 'system',
      text: result.logMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'routine',
      deviceUpdates: result.appliedUpdates,
    };
    setTranscriptHistory((prev) => [...prev, logMsg]);
    speakResponse(result.logMessage);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-6xl mx-auto space-y-5 sm:space-y-6"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            id="home-ai-back-btn"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-mono text-stone-300 hover:text-white transition-all group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-stone-300 group-hover:-translate-x-1 transition-transform" />
            <span>Dashboard</span>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif-heading text-base sm:text-xl text-stone-100 font-bold tracking-wide">
                Voice & Automation Hub
              </h2>
              <span className="text-xs font-mono text-emerald-400">
                9 Zones Online
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Live acoustic command reception and proactive weather safety rules
            </p>
          </div>
        </div>

        {/* Right side controls: Weather Switcher & TTS Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Segmented Weather Simulation Selector */}
          <div className="flex items-center p-1 rounded-xl bg-stone-950 border border-stone-800">
            <span className="text-[10px] sm:text-[11px] font-mono text-stone-400 px-2">
              Weather:
            </span>
            <div className="flex items-center gap-1">
              <button
                id="weather-toggle-sunny"
                onClick={() => handleWeatherChange('sunny')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentWeather === 'sunny'
                    ? 'bg-amber-400 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Simulate Sunny Climate (No rules forced)"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sunny</span>
              </button>
              <button
                id="weather-toggle-rainy"
                onClick={() => handleWeatherChange('rainy')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentWeather === 'rainy'
                    ? 'bg-sky-400 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Simulate Rainy Weather (Triggers Rain Protection Prompt on first occurrence)"
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rainy</span>
              </button>
              <button
                id="weather-toggle-winter"
                onClick={() => handleWeatherChange('winter')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentWeather === 'winter'
                    ? 'bg-sky-300 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Simulate Winter Weather (Triggers Winter Protection Prompt on first occurrence)"
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Winter</span>
              </button>
              <button
                id="weather-toggle-night"
                onClick={() => handleWeatherChange('night')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  currentWeather === 'night'
                    ? 'bg-stone-700 text-white font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Simulate Nighttime"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Night</span>
              </button>
            </div>
          </div>

          {/* Spoken Output Toggle */}
          <button
            id="toggle-tts-audio"
            onClick={() => {
              const next = !ttsEnabled;
              setTtsEnabled(next);
              if (!next) cancelSpeech();
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              ttsEnabled
                ? 'bg-stone-800 text-stone-100 border-stone-600'
                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
            title={ttsEnabled ? 'Spoken Voice Output: Enabled (Click to Mute)' : 'Spoken Voice Output: Muted (Click to Enable)'}
          >
            {ttsEnabled ? (
              <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-stone-200'}`} />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-500" />
            )}
            <span className="font-mono text-xs hidden sm:inline">
              {ttsEnabled ? (isSpeaking ? 'Speaking...' : 'Voice: On') : 'Voice: Muted'}
            </span>
          </button>
        </div>
      </div>

      {/* Proactive Weather Trigger Notification Toast */}
      <AnimatePresence>
        {weatherTriggerNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-700 flex items-center justify-between gap-3 shadow-md"
          >
            <div className="flex items-center gap-2.5">
              <CloudRain className="w-5 h-5 text-sky-400 shrink-0" />
              <p className="text-xs sm:text-sm text-stone-100 font-medium">
                {weatherTriggerNotice}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-stone-800 text-stone-200 border border-stone-700">
              Rule Applied
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Mode Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-md">
        <button
          id="tab-spatial-view"
          onClick={() => setActiveTab('spatial')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'spatial'
              ? 'bg-stone-100 text-stone-950 shadow-md font-bold'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Interactive 3D Twin</span>
        </button>

        <button
          id="tab-voice-terminal"
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'voice'
              ? 'bg-stone-100 text-stone-950 shadow-md font-bold'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Voice & AI Hub</span>
        </button>

        <button
          id="tab-preferences-rules"
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'preferences'
              ? 'bg-stone-100 text-stone-950 shadow-md font-bold'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Protection Rules</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-stone-950 text-stone-300 border border-stone-800">
            {preferences.length}
          </span>
        </button>
      </div>

      {/* TAB 1: 3D Spatial House Interactive Scene */}
      {activeTab === 'spatial' && (
        <div className="space-y-5 sm:space-y-6">
          <House3DViewer
            roomsState={roomsState}
            setRoomsState={setRoomsState}
            currentWeather={currentWeather}
            onDeviceAction={(msg) => {
              setTranscriptHistory((prev) => [
                ...prev,
                {
                  id: `action-${Date.now()}`,
                  sender: 'system',
                  text: `[Spatial Interaction] ${msg}`,
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  type: 'command',
                },
              ]);
            }}
          />

          {/* Quick Telemetry & Activity Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            <div className="lg:col-span-7">
              <LiveDeviceMonitor roomsState={roomsState} />
            </div>
            <div className="lg:col-span-5">
              <ChatTranscript
                messages={transcriptHistory}
                onClear={() => setTranscriptHistory([])}
                isThinking={effectiveOrbState === 'thinking'}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Voice & Chat Terminal */}
      {activeTab === 'voice' && (
        <div className="space-y-5 sm:space-y-6">
          <div
            id="voice-interaction-console"
            className="w-full rounded-2xl bg-stone-900/60 border border-stone-800 backdrop-blur-xl p-4 sm:p-6 flex flex-col items-center justify-center relative shadow-xl"
          >
            {/* Top Status Header */}
            <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-stone-800/80">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-stone-300" />
                <span className="text-xs font-bold text-stone-200 uppercase tracking-wider font-mono">
                  Speech & AI Engine
                </span>
              </div>
              {/* Visible API Status Badge */}
              <div className="flex items-center gap-2">
                {apiKeyStatus?.hasKey ? (
                  <span
                    id="gemini-status-badge"
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-mono"
                    title="Gemini AI Cloud API is connected and active"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Gemini Cloud AI</span>
                  </span>
                ) : (
                  <span
                    id="gemini-status-badge"
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[11px] font-mono"
                    title="Operating via KeepSafe Local Automation Engine. Add GEMINI_API_KEY to Vercel Project Settings to enable Gemini."
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>Local NLP Engine</span>
                  </span>
                )}
              </div>
            </div>

            <VoiceOrb
              state={effectiveOrbState}
              interimTranscript={effectiveInterim}
              isPressed={effectiveIsPressed}
              roomsState={roomsState}
            />

            {/* Unified Command Toolstrip */}
            <div className="w-full mt-5 pt-4 border-t border-stone-800/80 flex flex-col sm:flex-row items-center gap-3">
              {/* Push-to-Talk Microphone Button */}
              <button
                id="push-to-talk-btn"
                onMouseDown={handleStartListening}
                onMouseUp={handleStopListening}
                onTouchStart={handleStartListening}
                onTouchEnd={handleStopListening}
                onMouseLeave={() => {
                  if (effectiveIsPressed) handleStopListening();
                }}
                disabled={effectiveOrbState === 'thinking'}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all select-none cursor-pointer shrink-0 ${
                  effectiveIsPressed
                    ? 'bg-stone-100 text-stone-950 shadow-lg scale-[0.98]'
                    : effectiveOrbState === 'thinking'
                    ? 'bg-stone-800 text-stone-400 border border-stone-700 cursor-wait'
                    : 'bg-stone-100 hover:bg-white text-stone-950 shadow-md active:scale-95'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>
                  {effectiveIsPressed
                    ? 'Release to Send'
                    : effectiveOrbState === 'thinking'
                    ? 'Processing...'
                    : 'Hold to Speak'}
                </span>
              </button>

              {/* Integrated Text Input Field */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (textInput.trim() && effectiveOrbState !== 'thinking') {
                    processTranscript(textInput);
                    setTextInput('');
                  }
                }}
                className="w-full flex-1 flex items-center gap-2 p-1.5 rounded-xl bg-stone-950 border border-stone-800 focus-within:border-stone-600 transition-colors"
              >
                <input
                  id="voice-text-command-input"
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type any command (e.g. Close doors and windows when it rains)..."
                  disabled={effectiveOrbState === 'thinking'}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-stone-200 placeholder-stone-500 focus:outline-none"
                />
                <button
                  id="voice-text-command-submit"
                  type="submit"
                  disabled={!textInput.trim() || effectiveOrbState === 'thinking'}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Send Command"
                >
                  <span>Send</span>
                  <Send className="w-3 h-3 text-stone-300" />
                </button>
              </form>
            </div>

            {effectiveSpeechError && (
              <div
                id="voice-speech-error-notice"
                className="mt-3 w-full p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2 text-xs text-rose-300 font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{effectiveSpeechError}</span>
              </div>
            )}

            {/* Smart Multi-Device Routines Quick Actions */}
            <div className="w-full mt-4 pt-3.5 border-t border-stone-800/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-stone-400">
                  <Sparkles className="w-3 h-3 text-stone-300" />
                  <span>Autonomous Multi-Device Routines</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">
                  Click or use voice command
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Routine 1: Goodnight */}
                <button
                  id="routine-btn-goodnight"
                  type="button"
                  onClick={triggerGoodnightDirect}
                  disabled={effectiveOrbState === 'thinking'}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-950/80 hover:bg-stone-800 border border-stone-800 hover:border-stone-600 text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0 group-hover:border-stone-700">
                    <Moon className="w-3.5 h-3.5 text-indigo-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-stone-200 group-hover:text-white truncate">
                      Goodnight
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono truncate">
                      AC eco + power down
                    </div>
                  </div>
                </button>

                {/* Routine 2: Bath Time */}
                <button
                  id="routine-btn-bath-time"
                  type="button"
                  onClick={triggerBathDirect}
                  disabled={effectiveOrbState === 'thinking'}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-950/80 hover:bg-stone-800 border border-stone-800 hover:border-stone-600 text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0 group-hover:border-stone-700">
                    <Bath className="w-3.5 h-3.5 text-cyan-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-stone-200 group-hover:text-white truncate">
                      Bath Time
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono truncate">
                      Light on + house off
                    </div>
                  </div>
                </button>

                {/* Routine 3: Leaving Home */}
                <button
                  id="routine-btn-leaving-home"
                  type="button"
                  onClick={triggerLeavingDirect}
                  disabled={effectiveOrbState === 'thinking'}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-950/80 hover:bg-stone-800 border border-stone-800 hover:border-stone-600 text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0 group-hover:border-stone-700">
                    <LogOut className="w-3.5 h-3.5 text-rose-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-stone-200 group-hover:text-white truncate">
                      Leaving Home
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono truncate">
                      Secure & shutdown
                    </div>
                  </div>
                </button>

                {/* Routine 4: Entering Home */}
                <button
                  id="routine-btn-entering-home"
                  type="button"
                  onClick={triggerEnteringDirect}
                  disabled={effectiveOrbState === 'thinking'}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-950/80 hover:bg-stone-800 border border-stone-800 hover:border-stone-600 text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0 group-hover:border-stone-700">
                    <LogIn className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-stone-200 group-hover:text-white truncate">
                      Entering Home
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono truncate">
                      Living AC & fan (low)
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="w-full mt-3.5 flex flex-wrap items-center justify-start gap-1.5 pt-3 border-t border-stone-800/40 text-xs">
              <span className="text-stone-400 font-mono text-[10px] sm:text-[11px] mr-1">Voice triggers:</span>
              {[
                'Goodnight',
                'Taking a bath',
                'Leaving home',
                "I'm home",
                'Close doors and windows when it rains',
                'Lock all exterior doors',
                'Set living room AC to 68',
                'Turn off all AC units in winter',
              ].map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSamplePrompt(sample)}
                  disabled={effectiveOrbState === 'thinking'}
                  className="px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-colors cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            <div className="lg:col-span-7">
              <ChatTranscript
                messages={transcriptHistory}
                onClear={() => setTranscriptHistory([])}
                isThinking={effectiveOrbState === 'thinking'}
              />
            </div>
            <div className="lg:col-span-5">
              <LiveDeviceMonitor roomsState={roomsState} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Stored Rules & Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-5 sm:space-y-6">
          <PreferencesPanel
            preferences={preferences}
            currentWeather={currentWeather}
            onRemovePreference={handleRemovePreference}
            onTriggerPreference={handleTriggerPreference}
            onAddSampleRule={handleAddSampleRule}
            onTogglePreference={handleTogglePreference}
          />
          <LiveDeviceMonitor roomsState={roomsState} />
        </div>
      )}
    </motion.div>
  );
}
