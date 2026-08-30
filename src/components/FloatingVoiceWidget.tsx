/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  X,
  Send,
  Volume2,
  Sparkles,
  CheckCircle2,
  Activity,
  GripHorizontal,
  ChevronRight,
} from 'lucide-react';
import type { OrbState, AllRoomsState, RoutineOption, RoutinePromptData } from '../types';

interface FloatingVoiceWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  orbState: OrbState;
  interimTranscript: string;
  lastCommandResult: string | null;
  lastDeviceUpdates?: Record<string, any> | null;
  isListening: boolean;
  followUpCountdown: number | null;
  routinePromptData?: RoutinePromptData | null;
  onSelectRoutineOption?: (option: RoutineOption) => void;
  onSubmitText: (text: string) => void;
  onToggleMic: () => void;
}

export function FloatingVoiceWidget({
  isOpen,
  onClose,
  orbState,
  interimTranscript,
  lastCommandResult,
  lastDeviceUpdates,
  isListening,
  followUpCountdown,
  routinePromptData,
  onSelectRoutineOption,
  onSubmitText,
  onToggleMic,
}: FloatingVoiceWidgetProps) {
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic waveform heights
  const waveformHeights = [10, 22, 34, 16, 28, 40, 20, 32, 14, 26, 36, 18, 30, 12];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSubmitText(textInput.trim());
    setTextInput('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="floating-voice-assistant-widget"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        drag
        dragMomentum={false}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] max-w-[390px] sm:max-w-[430px] rounded-2xl bg-stone-950/95 border border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,255,255,0.04)] backdrop-blur-2xl text-stone-300 overflow-hidden flex flex-col"
        style={{ touchAction: 'none' }}
      >
        {/* Top Header / Drag Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800/80 bg-stone-900/60 select-none cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2.5">
            {/* Status Dot */}
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isListening
                    ? 'bg-amber-400 animate-ping absolute'
                    : orbState === 'thinking'
                    ? 'bg-stone-300 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isListening
                    ? 'bg-amber-400'
                    : orbState === 'thinking'
                    ? 'bg-stone-300'
                    : 'bg-emerald-400'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-100 tracking-tight">
                  KeepSafe Assistant
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-stone-800/80 text-stone-400 rounded border border-stone-700/50">
                  Voice
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="text-stone-600 hover:text-stone-400 p-1" title="Drag to reposition">
              <GripHorizontal className="w-4 h-4" />
            </div>
            <button
              id="close-floating-voice-widget"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-3.5">
          {/* Audio Waveform & Status Header */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-900/80 border border-stone-800">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isListening
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    : orbState === 'thinking'
                    ? 'bg-stone-800 text-stone-200 border border-stone-700'
                    : 'bg-stone-800/60 text-stone-400'
                }`}
              >
                {isListening ? (
                  <Mic className="w-4 h-4 animate-pulse" />
                ) : orbState === 'thinking' ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                  {isListening
                    ? 'Listening Live'
                    : orbState === 'thinking'
                    ? 'Context Engine'
                    : followUpCountdown !== null
                    ? `Standby (${followUpCountdown}s)`
                    : 'Ready'}
                </div>
                <div className="text-xs font-medium text-stone-200 truncate">
                  {isListening
                    ? 'Speak your command now...'
                    : orbState === 'thinking'
                    ? 'Executing & verifying state...'
                    : followUpCountdown !== null
                    ? 'Listening for follow-up...'
                    : 'Wake word active'}
                </div>
              </div>
            </div>

            {/* Visualizer bars */}
            <div className="flex items-center gap-0.5 h-5 shrink-0">
              {waveformHeights.slice(0, 10).map((h, i) => (
                <motion.div
                  key={i}
                  className={`w-0.5 rounded-full ${
                    isListening
                      ? 'bg-amber-400'
                      : orbState === 'thinking'
                      ? 'bg-stone-300'
                      : 'bg-stone-700'
                  }`}
                  animate={{
                    height: isListening
                      ? [h * 0.3, h, h * 0.25]
                      : orbState === 'thinking'
                      ? [h * 0.2, h * 0.6, h * 0.3]
                      : 3,
                    opacity: isListening ? 1 : 0.4,
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: isListening ? 0.5 + (i % 4) * 0.08 : 1.2,
                    ease: 'easeInOut',
                    delay: i * 0.04,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Transcript Display Box */}
          <div className="min-h-[76px] max-h-[140px] overflow-y-auto p-3 rounded-xl bg-stone-950 border border-stone-800/80 custom-scrollbar flex flex-col justify-center">
            {interimTranscript ? (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-stone-500 uppercase">You:</span>
                <p className="text-xs sm:text-sm font-medium text-amber-200 font-mono leading-relaxed">
                  &ldquo;{interimTranscript}&rdquo;
                </p>
              </div>
            ) : lastCommandResult ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Executed</span>
                </div>
                <p className="text-xs text-stone-200 leading-relaxed">{lastCommandResult}</p>
                {lastDeviceUpdates && Object.keys(lastDeviceUpdates).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(lastDeviceUpdates).map(([zone, updates]: [string, any]) => (
                      <span
                        key={zone}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700"
                      >
                        {zone}: {JSON.stringify(updates).replace(/["{}]/g, '')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-stone-400 text-xs">
                <p className="font-medium text-stone-300">Try saying:</p>
                <p className="text-[11px] font-mono text-stone-400 mt-1">
                  &ldquo;Dim dining room light to 40%&rdquo; • &ldquo;Goodnight&rdquo; • &ldquo;Lock garage&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Routine Option Picker (if a multi-zone routine requires room selection) */}
          {routinePromptData && routinePromptData.options && (
            <div className="p-3 rounded-xl bg-stone-900 border border-amber-500/30 space-y-2">
              <p className="text-xs font-medium text-amber-300">
                {routinePromptData.question || routinePromptData.subText || 'Select room location for this routine:'}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {routinePromptData.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectRoutineOption?.(opt)}
                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-left font-medium text-stone-200 border border-stone-700 hover:border-amber-400/50 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>{opt.label}</span>
                    <ChevronRight className="w-3 h-3 text-stone-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Countdown Progress Bar */}
          {followUpCountdown !== null && followUpCountdown > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
                <span>Listening for follow-up command...</span>
                <span>{followUpCountdown}s</span>
              </div>
              <div className="w-full h-1 bg-stone-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-amber-400/80 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(followUpCountdown / 8) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'linear' }}
                />
              </div>
            </div>
          )}

          {/* Interactive Bottom Control Bar */}
          <div className="flex items-center gap-2 pt-1 border-t border-stone-800/80">
            {/* Mic Toggle Button */}
            <button
              id="floating-widget-mic-btn"
              type="button"
              onClick={onToggleMic}
              className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isListening
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-[0_0_16px_rgba(251,191,36,0.5)]'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
              }`}
              title={isListening ? 'Click to stop listening' : 'Click to speak'}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            {/* Quick Text Input Form */}
            <form onSubmit={handleFormSubmit} className="flex-1 flex items-center gap-1.5 min-w-0">
              <input
                ref={inputRef}
                id="floating-widget-text-input"
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type a command..."
                className="w-full px-3 py-2 text-xs bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-stone-600 font-medium"
              />
              <button
                id="floating-widget-submit-btn"
                type="submit"
                disabled={!textInput.trim()}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:hover:bg-stone-800 text-stone-200 border border-stone-700 transition-colors cursor-pointer shrink-0"
                aria-label="Send command"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
