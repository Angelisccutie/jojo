/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Zap, Check, X } from 'lucide-react';
import type { TemperatureUnit } from '../types';
import { formatTemperature } from '../utils/powerAndTemp';

export interface AcPowerSavingPromptData {
  roomName: string;
  targetTempF: number;
  suggestedTempF: number;
  onConfirmOptimize: () => void;
  onKeepSetting: () => void;
}

interface AcPowerSavingModalProps {
  data: AcPowerSavingPromptData | null;
  tempUnit: TemperatureUnit;
  onClose: () => void;
}

export function AcPowerSavingModal({
  data,
  tempUnit,
  onClose,
}: AcPowerSavingModalProps) {
  if (!data) return null;

  const targetFormatted = formatTemperature(data.targetTempF, tempUnit);
  const suggestedFormatted = formatTemperature(data.suggestedTempF, tempUnit);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-left relative overflow-hidden"
        >
          {/* Top Decorative Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                  Power-Saving Suggestion
                </span>
                <h3 className="text-lg font-bold text-white font-headline">
                  {data.roomName} Climate
                </h3>
              </div>
            </div>
            <button
              onClick={() => {
                data.onKeepSetting();
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Dismiss modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Question Body */}
          <p className="text-sm text-slate-200 leading-relaxed mb-4">
            Setting to <strong className="text-amber-300 font-mono">{targetFormatted}</strong> will draw significantly higher continuous wattage. Optimize to <strong className="text-emerald-400 font-mono">{suggestedFormatted}</strong> instead?
          </p>

          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block mb-1">Your Selection</span>
              <span className="text-base font-bold font-mono text-amber-400">{targetFormatted}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">+45% Power Draw</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[10px] font-mono text-emerald-400 block mb-1">Recommended Eco</span>
              <span className="text-base font-bold font-mono text-emerald-300">{suggestedFormatted}</span>
              <span className="text-[10px] text-emerald-400/80 block mt-0.5">Optimal Comfort/Draw</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              id="ac-optimize-for-me-btn"
              type="button"
              onClick={() => {
                data.onConfirmOptimize();
                onClose();
              }}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Optimize for me</span>
            </button>
            <button
              id="ac-keep-my-setting-btn"
              type="button"
              onClick={() => {
                data.onKeepSetting();
                onClose();
              }}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer border border-slate-700"
            >
              <span>Keep my setting</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
