/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import type { OrbState, AllRoomsState } from '../types';
import {
  Mic,
  Volume2,
  DoorClosed,
  Wind,
  Thermometer,
  Lightbulb,
  Fan,
  Shield,
  Home,
  Radio,
  Activity,
} from 'lucide-react';

interface VoiceOrbProps {
  state: OrbState;
  interimTranscript?: string;
  isPressed?: boolean;
  roomsState?: AllRoomsState;
}

const HOUSE_ZONES = [
  { id: 'living', name: 'Living Room', icon: Home, endpoint: 'Front Door & Climate' },
  { id: 'kitchen', name: 'Kitchen', icon: Wind, endpoint: 'Window & Exhaust' },
  { id: 'bedroomMain', name: 'Master Bed', icon: Thermometer, endpoint: 'AC & Ambient Lights' },
  { id: 'balcony', name: 'Guest Room', icon: Wind, endpoint: 'Bed 2 & Climate Fan' },
  { id: 'garage', name: 'Garage', icon: DoorClosed, endpoint: 'Roll-up Barrier & Light' },
  { id: 'diningRoom', name: 'Dining Room', icon: Lightbulb, endpoint: 'Chandelier & Heat' },
  { id: 'bathroom', name: 'Bathroom 1', icon: Fan, endpoint: 'Ventilation Fan' },
  { id: 'porch', name: 'Porch Entry', icon: Shield, endpoint: 'Exterior Sconce & Lock' },
  { id: 'hallway', name: 'Studio Suite', icon: Radio, endpoint: 'Bed 3 & Workstation' },
];

export function VoiceOrb({ state, interimTranscript, isPressed }: VoiceOrbProps) {
  const isListening = isPressed || state === 'listening';
  const isThinking = state === 'thinking';

  // Dynamic waveform bars for listening state
  const waveformHeights = [12, 24, 38, 18, 32, 44, 22, 36, 16, 28, 42, 20, 34, 14];

  return (
    <div id="home-voice-zone-console" className="w-full flex flex-col items-center">
      {/* Top Acoustic & Sensor Activity Header Bar */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-stone-950/80 border border-stone-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isListening
                ? 'bg-stone-100 animate-ping'
                : isThinking
                ? 'bg-stone-300 animate-pulse'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-xs font-mono font-medium text-stone-300">
            {isListening
              ? 'Microphone Active — Streaming Voice Command'
              : isThinking
              ? 'Context Engine — Processing Zone Instructions'
              : 'Voice Sensor Online — 9 Zones Connected'}
          </span>
        </div>

        {/* Live Acoustic Frequency Waveform */}
        <div className="flex items-center gap-1 h-5 self-end sm:self-center">
          {waveformHeights.map((height, i) => (
            <motion.div
              key={i}
              className={`w-1 rounded-full transition-colors ${
                isListening
                  ? 'bg-stone-100'
                  : isThinking
                  ? 'bg-stone-300'
                  : 'bg-stone-700'
              }`}
              animate={{
                height: isListening
                  ? [height * 0.35, height, height * 0.25]
                  : isThinking
                  ? [height * 0.25, height * 0.65, height * 0.35]
                  : 3,
                opacity: isListening ? [0.6, 1, 0.6] : isThinking ? 0.8 : 0.3,
              }}
              transition={{
                repeat: Infinity,
                duration: isListening ? 0.5 + (i % 5) * 0.08 : 1.1,
                ease: 'easeInOut',
                delay: i * 0.03,
              }}
            />
          ))}
        </div>
      </div>

      {/* Spoken Transcript Terminal HUD */}
      <div className="w-full min-h-[58px] px-4 py-3 rounded-xl bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-4 mb-4 transition-all">
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-stone-800 text-stone-100 border border-stone-700'
                : isThinking
                ? 'bg-stone-800 text-stone-200 border border-stone-700'
                : 'bg-stone-900 text-stone-400'
            }`}
          >
            {isListening ? (
              <Mic className="w-4 h-4" />
            ) : isThinking ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </div>
          <div className="truncate">
            <div className="text-[10px] font-mono uppercase text-stone-400">
              {isListening
                ? 'Transcribing Input'
                : isThinking
                ? 'Evaluating Safety Rules'
                : 'Voice Instruction Readout'}
            </div>
            <div className="text-xs sm:text-sm font-medium text-stone-200 truncate mt-0.5">
              {interimTranscript ? (
                <span className="text-stone-100 font-mono">&ldquo;{interimTranscript}&rdquo;</span>
              ) : isListening ? (
                <span className="text-stone-400 italic">Listening for spoken command...</span>
              ) : isThinking ? (
                <span className="text-stone-300 font-mono">Parsing command and validating environmental rules...</span>
              ) : (
                <span className="text-stone-400">Hold microphone button below or type a command to control any zone.</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick status label */}
        <span className="hidden sm:inline text-xs font-mono text-stone-400 shrink-0">
          {isListening ? 'Streaming' : isThinking ? 'Applying' : 'Standby'}
        </span>
      </div>

      {/* House Zone Responsive Grid: 1 col on mobile, 2 col on sm, 3 col on lg */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {HOUSE_ZONES.map((zone) => {
          const Icon = zone.icon;
          const isTargeted =
            isThinking &&
            interimTranscript &&
            interimTranscript.toLowerCase().includes(zone.name.toLowerCase().split(' ')[0]);

          return (
            <motion.div
              key={zone.id}
              animate={{
                scale: isTargeted ? 1.02 : 1,
              }}
              className={`p-3 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                isTargeted
                  ? 'bg-stone-900 border-stone-600 shadow-lg'
                  : isListening
                  ? 'bg-stone-900/90 border-stone-700'
                  : 'bg-stone-950/60 border-stone-800/80 hover:border-stone-700'
              }`}
            >
              {/* Target pulse indicator */}
              {isTargeted && (
                <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl bg-stone-800 text-stone-200 border-b border-l border-stone-600 text-[9px] font-mono">
                  TARGET
                </div>
              )}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isTargeted
                        ? 'bg-stone-800 text-stone-200'
                        : isListening
                        ? 'bg-stone-800 text-stone-300'
                        : 'bg-stone-900 text-stone-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-stone-200">{zone.name}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400/90">Online</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-800/60 font-mono">
                <span className="truncate max-w-[130px]">{zone.endpoint}</span>
                <span className="text-[10px] text-stone-500">
                  {isListening ? 'Sensing' : 'Ready'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
