/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { CloudRain, Snowflake, Sun, Moon, ShieldCheck, Check, X } from 'lucide-react';
import type { WeatherCondition } from '../types';

export interface WeatherPromptData {
  weather: WeatherCondition;
  promptText: string;
  subText?: string;
  confirmLabel?: string;
  declineLabel?: string;
  onConfirm: () => void;
  onDecline: () => void;
}

interface WeatherConfirmationModalProps {
  data: WeatherPromptData | null;
  onClose: () => void;
}

export function WeatherConfirmationModal({
  data,
  onClose,
}: WeatherConfirmationModalProps) {
  if (!data) return null;

  const getWeatherIcon = (weather: WeatherCondition) => {
    switch (weather) {
      case 'rainy':
        return <CloudRain className="w-6 h-6 text-sky-300" />;
      case 'winter':
        return <Snowflake className="w-6 h-6 text-sky-200" />;
      case 'sunny':
        return <Sun className="w-6 h-6 text-amber-300" />;
      default:
        return <Moon className="w-6 h-6 text-stone-300" />;
    }
  };

  const confirmText = data.confirmLabel || 'Yes, always do this';
  const declineText = data.declineLabel || "No, don't do this";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-[#141414] border border-stone-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-left relative overflow-hidden"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -top-20 -right-20 w-44 h-44 bg-stone-700/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0">
                {getWeatherIcon(data.weather)}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono tracking-wider text-stone-400 uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 text-stone-300" />
                  <span>Atmospheric Protection Rule</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-stone-100 font-serif-heading tracking-wide capitalize">
                  {data.weather === 'rainy' ? 'Rain Protection' : data.weather === 'winter' ? 'Winter Climate Mode' : 'Weather Safety'}
                </h3>
              </div>
            </div>
            <button
              onClick={() => {
                data.onDecline();
                onClose();
              }}
              className="p-1.5 rounded-xl text-stone-500 hover:text-stone-200 hover:bg-stone-900 border border-transparent hover:border-stone-800 transition-colors cursor-pointer"
              aria-label="Dismiss modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Question Statement */}
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-950/90 border border-stone-800/90 mb-5">
            <p className="text-base sm:text-lg text-stone-100 font-medium leading-snug">
              &ldquo;{data.promptText}&rdquo;
            </p>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Your choice will be saved as a permanent preference. Future {data.weather} events will follow this decision automatically without asking again.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              id="weather-prompt-confirm-btn"
              type="button"
              onClick={() => {
                data.onConfirm();
                onClose();
              }}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-stone-100 hover:bg-white text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{confirmText}</span>
            </button>
            <button
              id="weather-prompt-decline-btn"
              type="button"
              onClick={() => {
                data.onDecline();
                onClose();
              }}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer border border-stone-800 flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5 text-stone-400" />
              <span>{declineText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
