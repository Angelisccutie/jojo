/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import type { PreferenceRule, WeatherCondition } from '../types';
import {
  Sparkles,
  Trash2,
  Play,
  CloudRain,
  Sun,
  Snowflake,
  Moon,
  Plus,
  ShieldCheck,
  Zap,
  Power,
} from 'lucide-react';

interface PreferencesPanelProps {
  preferences: PreferenceRule[];
  currentWeather: WeatherCondition;
  onRemovePreference: (id: string) => void;
  onTriggerPreference: (preference: PreferenceRule) => void;
  onAddSampleRule: (rule: Omit<PreferenceRule, 'id' | 'createdAt'>) => void;
  onTogglePreference?: (id: string) => void;
}

export function PreferencesPanel({
  preferences,
  currentWeather,
  onRemovePreference,
  onTriggerPreference,
  onAddSampleRule,
  onTogglePreference,
}: PreferencesPanelProps) {
  const getConditionIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('storm')) return <CloudRain className="w-4 h-4 text-sky-300" />;
    if (c.includes('winter') || c.includes('cold') || c.includes('snow')) return <Snowflake className="w-4 h-4 text-sky-200" />;
    if (c.includes('sun') || c.includes('hot') || c.includes('summer')) return <Sun className="w-4 h-4 text-amber-300" />;
    if (c.includes('night') || c.includes('dark')) return <Moon className="w-4 h-4 text-stone-400" />;
    return <Sparkles className="w-4 h-4 text-stone-300" />;
  };

  const sampleRules = [
    {
      ruleText: 'Close all doors and windows whenever it rains',
      condition: 'rainy',
      conditionDescription: 'Rain / Severe Precipitation',
      summary: 'Automatically lock & close front door, garage door, and kitchen window',
      deviceUpdates: {
        livingRoom: { mainDoorOpen: false },
        kitchen: { windowOpen: false },
        garage: { garageDoorOpen: false },
      },
    },
    {
      ruleText: 'Turn off all AC units and ceiling fans in winter',
      condition: 'winter',
      conditionDescription: 'Winter / Freezing Climate',
      summary: 'Power down all room ACs and set fans to low for conservation',
      deviceUpdates: {
        livingRoom: { acPower: false, fanMode: 'low', fanSpeed: 20, mainDoorOpen: false },
        bedroomMain: { acPower: false },
        bedroom2: { acPower: false, fanMode: 'low', fanSpeed: 20 },
        bedroom3: { acPower: false },
        diningRoom: { acPower: false },
        kitchen: { windowOpen: false },
        garage: { garageDoorOpen: false },
      },
    },
    {
      ruleText: 'Cool down living room and master bedroom on sunny days',
      condition: 'sunny',
      conditionDescription: 'Sunny / Warm Weather',
      summary: 'Turn on AC to 68°F and engage living room fan',
      deviceUpdates: {
        livingRoom: { acPower: true, acTemp: 68, fanPower: true, fanSpeed: 70 },
        bedroomMain: { acPower: true, acTemp: 68 },
      },
    },
  ];

  return (
    <div
      id="home-ai-preferences-panel"
      className="w-full rounded-2xl bg-[#121212]/90 border border-stone-800 backdrop-blur-md p-4 sm:p-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 sm:pb-5 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-stone-300" />
            <h3 className="text-base font-semibold text-stone-100 tracking-wide font-serif-heading">
              Protection Rules & Preferences
            </h3>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Confirmed weather safety decisions and user-defined automation rules. Trigger automatically during weather transitions or run on demand.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs text-stone-500 font-mono">Current Weather:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-900 text-stone-200 border border-stone-800 capitalize font-mono">
            {getConditionIcon(currentWeather)}
            <span>{currentWeather}</span>
          </span>
        </div>
      </div>

      {/* Preferences List */}
      <div className="mt-4 sm:mt-5 space-y-3">
        <AnimatePresence mode="popLayout">
          {preferences.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 sm:py-10 text-center rounded-xl border border-dashed border-stone-800 bg-stone-950/60 p-5 sm:p-6"
            >
              <Zap className="w-8 h-8 text-stone-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-200">No Protection Rules or Preferences Stored Yet</p>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4">
                Switch weather to <span className="text-stone-300 font-mono">Rainy</span> or <span className="text-stone-300 font-mono">Winter</span> to configure one-time safety rules, say a voice command, or add a preset below.
              </p>
              {/* Sample Rule Quick Add Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {sampleRules.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAddSampleRule(sample)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 transition-all hover:border-stone-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-stone-300" />
                    <span>{sample.ruleText}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            preferences.map((pref) => {
              const isMatch =
                currentWeather.toLowerCase() === pref.condition.toLowerCase() ||
                pref.conditionDescription.toLowerCase().includes(currentWeather.toLowerCase());
              const isEnabled = pref.enabled !== false;

              return (
                <motion.div
                  key={pref.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative rounded-xl border p-3.5 sm:p-4 transition-all duration-200 ${
                    !isEnabled
                      ? 'bg-stone-950/40 border-stone-800/60 opacity-70'
                      : isMatch
                      ? 'bg-stone-900/90 border-stone-600 shadow-md'
                      : 'bg-stone-950/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-stone-900 text-stone-300 border border-stone-800">
                          {getConditionIcon(pref.condition)}
                          <span className="capitalize">{pref.condition}</span>
                        </span>

                        {/* Status badge */}
                        {pref.enabled !== undefined && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                              pref.enabled
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                                : 'bg-stone-900 text-stone-400 border-stone-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                pref.enabled ? 'bg-emerald-400' : 'bg-stone-500'
                              }`}
                            />
                            {pref.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        )}

                        {pref.isWeatherSafetyRule && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-stone-900 text-stone-400 border border-stone-800">
                            Safety Decision
                          </span>
                        )}

                        {isMatch && isEnabled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-stone-800 text-stone-200 border border-stone-600 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                            Condition Currently Active
                          </span>
                        )}

                        <span className="text-[10px] sm:text-[11px] text-stone-500 font-mono">
                          {pref.createdAt}
                        </span>
                      </div>

                      {/* Plain Language Rule Statement */}
                      <p className="text-xs sm:text-sm font-semibold text-stone-100 group-hover:text-stone-200 transition-colors font-sans">
                        &ldquo;{pref.ruleText}&rdquo;
                      </p>
                      <p className="text-xs text-stone-400 font-normal">
                        {pref.summary}
                      </p>

                      {/* Target device states badge */}
                      {pref.deviceUpdates && Object.keys(pref.deviceUpdates).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(pref.deviceUpdates).map(([room, updates]) => (
                            <span
                              key={room}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800"
                            >
                              {room}: {JSON.stringify(updates).replace(/[{}]/g, '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions: Toggle / Run / Delete */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800 self-end sm:self-center">
                      {onTogglePreference && (
                        <button
                          onClick={() => onTogglePreference(pref.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                            isEnabled
                              ? 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-700'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800'
                          }`}
                          title={isEnabled ? 'Disable this rule' : 'Enable this rule'}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{isEnabled ? 'Disable' : 'Enable'}</span>
                        </button>
                      )}

                      {isEnabled && pref.deviceUpdates && Object.keys(pref.deviceUpdates).length > 0 && (
                        <button
                          onClick={() => onTriggerPreference(pref)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-stone-100 border border-stone-700 transition-all cursor-pointer"
                          title="Trigger this automation rule now"
                        >
                          <Play className="w-3.5 h-3.5 text-stone-300" />
                          <span>Run Now</span>
                        </button>
                      )}

                      <button
                        onClick={() => onRemovePreference(pref.id)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                        title="Remove / Reset preference (you will be asked again next time)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer Add Preset Options */}
      {preferences.length > 0 && (
        <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2.5 text-xs text-stone-500 font-mono">
          <span>Add more automation recipes:</span>
          <div className="flex flex-wrap gap-2">
            {sampleRules.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => onAddSampleRule(sample)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-950 hover:bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-stone-300" />
                <span>{sample.condition.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
