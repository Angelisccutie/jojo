/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { Moon, Bath, Sparkles, X, Sofa, BedDouble, Bed, ChevronRight } from 'lucide-react';
import type { RoutinePromptData, RoutineOption } from '../types';

interface RoutineLocationModalProps {
  data: RoutinePromptData | null;
  onClose: () => void;
}

export function RoutineLocationModal({ data, onClose }: RoutineLocationModalProps) {
  if (!data) return null;

  const getHeaderIcon = () => {
    if (data.routineId === 'goodnight') {
      return <Moon className="w-6 h-6 text-indigo-300" />;
    }
    if (data.routineId === 'bath_time') {
      return <Bath className="w-6 h-6 text-cyan-300" />;
    }
    return <Sparkles className="w-6 h-6 text-amber-300" />;
  };

  const getOptionIcon = (option: RoutineOption) => {
    switch (option.roomKey) {
      case 'livingRoom':
        return <Sofa className="w-5 h-5 text-stone-300" />;
      case 'bedroomMain':
        return <BedDouble className="w-5 h-5 text-stone-200" />;
      case 'bedroom2':
      case 'bedroom3':
        return <Bed className="w-5 h-5 text-stone-300" />;
      case 'bathroomMain':
      case 'bathroom2':
        return <Bath className="w-5 h-5 text-cyan-300" />;
      default:
        return <Sparkles className="w-5 h-5 text-stone-400" />;
    }
  };

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
          {/* Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-stone-700/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0">
                {getHeaderIcon()}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono tracking-wider text-stone-400 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-stone-300" />
                  <span>Smart Routine Execution</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-stone-100 font-serif-heading tracking-wide">
                  {data.title}
                </h3>
              </div>
            </div>
            <button
              id="routine-modal-close-btn"
              onClick={() => {
                data.onCancel();
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
              &ldquo;{data.question}&rdquo;
            </p>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              {data.subText ||
                'Select your location to coordinate multi-device actions and power management across all zones.'}
            </p>
          </div>

          {/* Room Selection Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.options.map((option) => (
              <button
                key={option.id}
                id={`routine-option-${option.id}`}
                type="button"
                onClick={() => {
                  data.onSelectOption(option);
                  onClose();
                }}
                className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/90 hover:bg-stone-800/90 border border-stone-800 hover:border-stone-600 text-left transition-all active:scale-[0.98] cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0 group-hover:border-stone-700 transition-colors">
                    {getOptionIcon(option)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-100 group-hover:text-white transition-colors">
                      {option.label}
                    </h4>
                    {option.description && (
                      <p className="text-[11px] text-stone-400 font-mono">
                        {option.description}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>

          {/* Cancel Footer */}
          <div className="mt-4 pt-3 border-t border-stone-800/60 flex justify-end">
            <button
              id="routine-modal-cancel-btn"
              type="button"
              onClick={() => {
                data.onCancel();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            >
              Cancel Routine
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
