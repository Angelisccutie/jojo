/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Fan, Power, LucideIcon } from 'lucide-react';

interface LightDimmerCardProps {
  idPrefix?: string;
  title: string;
  subtitle?: string;
  isOn: boolean;
  intensity: number;
  icon?: LucideIcon;
  onToggle: () => void;
  onChangeIntensity: (val: number) => void;
  ariaLabel?: string;
}

export function LightDimmerCard({
  idPrefix = 'light',
  title,
  subtitle,
  isOn,
  intensity,
  icon: Icon = Sun,
  onToggle,
  onChangeIntensity,
  ariaLabel = 'Toggle Light',
}: LightDimmerCardProps) {
  const currentIntensity = isOn ? Math.max(0, Math.min(100, intensity ?? 100)) : 0;

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isOn
          ? 'bg-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
          : 'bg-white/[0.02] border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
          <Icon className={`w-5 h-5 ${isOn ? 'text-amber-400' : 'text-white/40'}`} />
        </div>
        <button
          id={`${idPrefix}-toggle`}
          onClick={onToggle}
          className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
            isOn ? 'bg-amber-400' : 'bg-white/20'
          }`}
          aria-label={ariaLabel}
        >
          <div
            className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
              isOn ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="flex justify-between items-baseline mb-1">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
          {title}
        </h4>
        <span className="text-xs font-mono font-bold text-amber-400">
          {isOn ? `${currentIntensity}%` : 'OFF'}
        </span>
      </div>

      {subtitle && <p className="text-xs text-white/50 mb-2.5">{subtitle}</p>}

      <input
        id={`${idPrefix}-slider`}
        type="range"
        min="0"
        max="100"
        disabled={!isOn}
        value={currentIntensity}
        onChange={(e) => {
          const val = Number(e.target.value);
          onChangeIntensity(val);
        }}
        className="w-full accent-amber-400 h-1.5 bg-white/10 rounded-full cursor-pointer mb-2.5 disabled:opacity-40"
      />

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
        <span className="text-white/40">ILLUMINATION:</span>
        <span className={isOn ? 'text-amber-400 font-bold' : 'text-slate-500 font-bold'}>
          {isOn ? `${currentIntensity}% DIM` : 'OFF'}
        </span>
      </div>
    </div>
  );
}

interface FanSpeedCardProps {
  idPrefix?: string;
  title: string;
  subtitle?: string;
  isOn: boolean;
  speed: number;
  mode: 'off' | 'low' | 'med' | 'high';
  onToggle: () => void;
  onChangeSpeed: (speed: number, mode: 'off' | 'low' | 'med' | 'high') => void;
  ariaLabel?: string;
}

export function FanSpeedCard({
  idPrefix = 'fan',
  title,
  subtitle,
  isOn,
  speed,
  mode,
  onToggle,
  onChangeSpeed,
  ariaLabel = 'Toggle Fan',
}: FanSpeedCardProps) {
  const currentSpeed = isOn ? Math.max(0, Math.min(100, speed ?? 50)) : 0;

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isOn
          ? 'bg-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
          : 'bg-white/[0.02] border-white/10'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
          <Fan className={`w-5 h-5 ${isOn ? 'text-blue-400 animate-spin' : 'text-white/40'}`} />
        </div>
        <button
          id={`${idPrefix}-power-toggle`}
          onClick={onToggle}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            isOn
              ? 'bg-blue-600 border-blue-400 text-white shadow-sm'
              : 'bg-white/5 border-white/10 text-white/40'
          }`}
          aria-label={ariaLabel}
        >
          <Power className="w-4 h-4" />
        </button>
      </div>

      <div className="flex justify-between items-baseline mb-1">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">
          {title}
        </h4>
        <span className="text-xs font-mono font-bold text-blue-400">
          {isOn ? `${currentSpeed}%` : 'OFF'}
        </span>
      </div>

      {subtitle && <p className="text-xs text-white/50 mb-2">{subtitle}</p>}

      <input
        id={`${idPrefix}-slider`}
        type="range"
        min="0"
        max="100"
        disabled={!isOn}
        value={currentSpeed}
        onChange={(e) => {
          const newSpeed = Number(e.target.value);
          let newMode: 'off' | 'low' | 'med' | 'high' = 'off';
          if (newSpeed > 75) newMode = 'high';
          else if (newSpeed > 35) newMode = 'med';
          else if (newSpeed > 0) newMode = 'low';
          onChangeSpeed(newSpeed, newMode);
        }}
        className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-full cursor-pointer mb-2.5 disabled:opacity-40"
      />

      <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-white/10">
        {(['off', 'low', 'med', 'high'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              if (m === 'off') {
                onChangeSpeed(0, 'off');
              } else {
                const spd = m === 'low' ? 30 : m === 'med' ? 65 : 100;
                onChangeSpeed(spd, m);
              }
            }}
            className={`py-1 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
              mode === m && isOn
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-white/40 hover:text-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
