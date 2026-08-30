/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import type { AllRoomsState } from '../types';
import { calculatePowerUsage } from '../utils/powerAndTemp';

interface PowerMeterWidgetProps {
  roomsState: AllRoomsState;
}

export function PowerMeterWidget({ roomsState }: PowerMeterWidgetProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const telemetry = calculatePowerUsage(roomsState);

  // Percentage on 4000W scale for gauge
  const gaugePercent = Math.min(100, Math.max(4, Math.round((telemetry.totalWatts / 4000) * 100)));

  const getLoadBadge = () => {
    switch (telemetry.loadLevel) {
      case 'eco':
        return {
          label: 'Eco Mode',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          barColor: 'from-emerald-500 to-stone-300',
        };
      case 'normal':
        return {
          label: 'Normal Load',
          color: 'text-stone-300 bg-stone-800 border-stone-700',
          barColor: 'from-stone-500 to-stone-200',
        };
      case 'elevated':
        return {
          label: 'Moderate Load',
          color: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
          barColor: 'from-stone-400 to-amber-400',
        };
      case 'heavy':
        return {
          label: 'High Draw',
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          barColor: 'from-rose-500 to-stone-200',
        };
    }
  };

  const badge = getLoadBadge();

  return (
    <div
      id="live-power-usage-widget"
      className="relative rounded-2xl bg-[#121212]/90 border border-stone-800 backdrop-blur-md p-3.5 sm:p-4 shadow-xl transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon & Total Wattage */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-200 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-mono font-bold text-stone-100 tracking-tight">
                {telemetry.totalWatts.toLocaleString()}
              </span>
              <span className="text-xs font-mono font-bold text-stone-300">
                W
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-stone-500">
                ({telemetry.totalKilowatts} kW)
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-stone-500 block">
              Live Total Power Draw
            </span>
          </div>
        </div>

        {/* Right: Load Level & Breakdown Toggle */}
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${badge.color}`}>
            {badge.label}
          </span>
          <button
            id="toggle-power-breakdown-btn"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
            title="Toggle power telemetry breakdown"
          >
            {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Dynamic Visual Power Gauge Bar */}
      <div className="mt-2.5 w-full h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800/80">
        <motion.div
          className={`h-full bg-gradient-to-r ${badge.barColor} rounded-full`}
          initial={false}
          animate={{ width: `${gaugePercent}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      {/* Mini Active Endpoints Count Subtext */}
      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-stone-500">
        <span>Active Loads: <strong className="text-stone-300">{telemetry.activeDeviceCount} endpoints</strong></span>
        <span>Grid: 120V / 60Hz</span>
      </div>

      {/* Expandable Category Breakdown */}
      <AnimatePresence>
        {showBreakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-stone-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono"
          >
            <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800/80">
              <span className="text-stone-500 block text-[10px]">HVAC & ACs</span>
              <strong className="text-stone-200 text-xs">{telemetry.breakdown.hvac} W</strong>
            </div>
            <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800/80">
              <span className="text-stone-500 block text-[10px]">Lighting</span>
              <strong className="text-stone-200 text-xs">{telemetry.breakdown.lighting} W</strong>
            </div>
            <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800/80">
              <span className="text-stone-500 block text-[10px]">Fans & Motors</span>
              <strong className="text-stone-200 text-xs">{telemetry.breakdown.appliances} W</strong>
            </div>
            <div className="p-2 rounded-lg bg-stone-950/80 border border-stone-800/80">
              <span className="text-stone-500 block text-[10px]">Standby Hub</span>
              <strong className="text-stone-200 text-xs">{telemetry.breakdown.standby} W</strong>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
