/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sofa,
  Bed,
  BedDouble,
  Utensils,
  ChefHat,
  Bath,
  Warehouse,
  Sun,
  Lightbulb,
  Fan,
  ThermometerSnowflake,
  DoorClosed,
  DoorOpen,
  Layers,
  Wind,
  Power,
  Flame,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  Moon,
  LogOut,
  LogIn,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { PowerMeterWidget } from './PowerMeterWidget';
import { ScrollReveal } from './ScrollReveal';
import { LightDimmerCard, FanSpeedCard } from './DeviceControls';
import { speakText } from '../utils/speech';
import type {
  AllRoomsState,
  RoomId,
  TemperatureUnit,
  RoutinePromptData,
  RoutineOption,
  TranscriptMessage,
} from '../types';
import { formatTemperature, checkAcPowerSaving } from '../utils/powerAndTemp';
import { playDoorSound, playLightClickSound } from '../utils/audioEffects';
import type { AcPowerSavingPromptData } from './AcPowerSavingModal';
import {
  GOODNIGHT_ROOM_OPTIONS,
  BATH_ROOM_OPTIONS,
  executeGoodnightRoutine,
  executeBathRoutine,
  executeLeavingHomeRoutine,
  executeEnteringHomeRoutine,
} from '../utils/routineRunner';

interface QuickDashboardProps {
  roomsState: AllRoomsState;
  setRoomsState: Dispatch<SetStateAction<AllRoomsState>>;
  onAccessHome: () => void;
  tempUnit?: TemperatureUnit;
  setTempUnit?: Dispatch<SetStateAction<TemperatureUnit>>;
  onRequestAcOptimization?: (prompt: AcPowerSavingPromptData) => void;
  dismissedSuggestionsRef?: MutableRefObject<Set<string>>;
  onRequestRoutinePrompt?: (data: RoutinePromptData) => void;
  setTranscriptHistory?: Dispatch<SetStateAction<TranscriptMessage[]>>;
}

interface RoomDefinition {
  id: RoomId;
  name: string;
  shortName: string;
  icon: LucideIcon;
  badge: string;
}

const ROOMS: RoomDefinition[] = [
  { id: 'living-room', name: 'Living Room', shortName: 'Living', icon: Sofa, badge: '4 Endpoints' },
  { id: 'bedroom-main', name: 'Master Suite', shortName: 'Master', icon: BedDouble, badge: '4 Endpoints' },
  { id: 'bedroom-2', name: 'Bedroom 2', shortName: 'Bed 2', icon: Bed, badge: '4 Endpoints' },
  { id: 'bedroom-3', name: 'Studio / Bed 3', shortName: 'Studio', icon: Bed, badge: '3 Endpoints' },
  { id: 'dining-room', name: 'Dining Room', shortName: 'Dining', icon: Utensils, badge: '2 Endpoints' },
  { id: 'kitchen', name: 'Kitchen', shortName: 'Kitchen', icon: ChefHat, badge: '3 Endpoints' },
  { id: 'bathroom-main', name: 'Main Bathroom', shortName: 'Bath 1', icon: Bath, badge: '2 Endpoints' },
  { id: 'bathroom-2', name: 'Guest Bath 2', shortName: 'Bath 2', icon: Bath, badge: '2 Endpoints' },
  { id: 'garage', name: 'Garage Bay', shortName: 'Garage', icon: Warehouse, badge: '2 Endpoints' },
];

export function QuickDashboard({
  roomsState,
  setRoomsState,
  onAccessHome,
  tempUnit = 'F',
  setTempUnit,
  onRequestAcOptimization,
  dismissedSuggestionsRef,
  onRequestRoutinePrompt,
  setTranscriptHistory,
}: QuickDashboardProps) {
  const [activeRoomId, setActiveRoomId] = useState<RoomId>('living-room');
  const [activeRoutineNotice, setActiveRoutineNotice] = useState<string | null>(null);
  const activeRoom = ROOMS.find((r) => r.id === activeRoomId) || ROOMS[0];

  const logRoutineMessage = (text: string, appliedUpdates: Record<string, any>) => {
    setActiveRoutineNotice(text);
    setTimeout(() => setActiveRoutineNotice(null), 4500);
    speakText(text);
    if (setTranscriptHistory) {
      const msg: TranscriptMessage = {
        id: `msg-${Date.now()}-routine`,
        sender: 'system',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'routine',
        deviceUpdates: appliedUpdates,
      };
      setTranscriptHistory((prev) => [...prev, msg]);
    }
  };

  const handleTriggerGoodnight = () => {
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
          logRoutineMessage(result.logMessage, result.appliedUpdates);
        },
        onCancel: () => {},
      });
    }
  };

  const handleTriggerBathTime = () => {
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
          logRoutineMessage(result.logMessage, result.appliedUpdates);
        },
        onCancel: () => {},
      });
    }
  };

  const handleTriggerLeavingHome = () => {
    console.log('Leaving Home routine triggered — executing shutdown and secure');
    const result = executeLeavingHomeRoutine(roomsState);
    setRoomsState(result.nextState);
    logRoutineMessage(result.logMessage, result.appliedUpdates);
  };

  const handleTriggerEnteringHome = () => {
    console.log('Entering Home routine triggered — executing welcome profile');
    const result = executeEnteringHomeRoutine(roomsState);
    setRoomsState(result.nextState);
    logRoutineMessage(result.logMessage, result.appliedUpdates);
  };

  const handleAcTempChange = (
    roomKey: keyof AllRoomsState,
    roomName: string,
    newTempF: number,
    currentTempF: number
  ) => {
    const clampedTempF = Math.min(85, Math.max(60, newTempF));
    const dismissedKey = `${roomKey}-${clampedTempF}`;
    const check = checkAcPowerSaving(clampedTempF, currentTempF);

    if (
      check.isAggressive &&
      onRequestAcOptimization &&
      !dismissedSuggestionsRef?.current.has(dismissedKey)
    ) {
      onRequestAcOptimization({
        roomName,
        targetTempF: clampedTempF,
        suggestedTempF: check.suggestedTempF,
        onConfirmOptimize: () => {
          setRoomsState((prev) => ({
            ...prev,
            [roomKey]: {
              ...(prev[roomKey] as any),
              acTemp: check.suggestedTempF,
            },
          }));
        },
        onKeepSetting: () => {
          dismissedSuggestionsRef?.current.add(dismissedKey);
          setRoomsState((prev) => ({
            ...prev,
            [roomKey]: {
              ...(prev[roomKey] as any),
              acTemp: clampedTempF,
            },
          }));
        },
      });
    } else {
      setRoomsState((prev) => ({
        ...prev,
        [roomKey]: {
          ...(prev[roomKey] as any),
          acTemp: clampedTempF,
        },
      }));
    }
  };

  const updateLiving = (patch: Partial<AllRoomsState['livingRoom']>) => {
    if ('mainDoorOpen' in patch) {
      playDoorSound('mainDoor', Boolean(patch.mainDoorOpen));
    }
    if ('lightPower' in patch) {
      playLightClickSound(true);
    }
    setRoomsState((prev) => ({
      ...prev,
      livingRoom: { ...prev.livingRoom, ...patch },
    }));
  };

  const updateBedroomMain = (patch: Partial<AllRoomsState['bedroomMain']>) => {
    if ('lightPower' in patch || 'lamp1Power' in patch || 'lamp2Power' in patch) {
      playLightClickSound(true);
    }
    setRoomsState((prev) => ({
      ...prev,
      bedroomMain: { ...prev.bedroomMain, ...patch },
    }));
  };

  const updateBedroom2 = (patch: Partial<AllRoomsState['bedroom2']>) => {
    if ('lightPower' in patch || 'lampPower' in patch) {
      playLightClickSound(true);
    }
    setRoomsState((prev) => ({
      ...prev,
      bedroom2: { ...prev.bedroom2, ...patch },
    }));
  };

  const updateBedroom3 = (patch: Partial<AllRoomsState['bedroom3']>) => {
    if ('lightPower' in patch || 'lampPower' in patch) {
      playLightClickSound(true);
    }
    setRoomsState((prev) => ({
      ...prev,
      bedroom3: { ...prev.bedroom3, ...patch },
    }));
  };

  const updateDining = (patch: Partial<AllRoomsState['diningRoom']>) => {
    if ('lightPower' in patch) {
      playLightClickSound(true);
    }
    setRoomsState((prev) => ({
      ...prev,
      diningRoom: { ...prev.diningRoom, ...patch },
    }));
  };

  const updateKitchen = (patch: Partial<AllRoomsState['kitchen']>) => {
    if ('lightPower' in patch) {
      playLightClickSound(true);
    }
    setRoomsState((prev) => ({
      ...prev,
      kitchen: { ...prev.kitchen, ...patch },
    }));
  };

  const updateBathroomMain = (patch: Partial<AllRoomsState['bathroomMain']>) => {
    if ('lightPower' in patch) {
      playLightClickSound(true);
    }
    setRoomsState((prev) => ({
      ...prev,
      bathroomMain: { ...prev.bathroomMain, ...patch },
    }));
  };

  const updateBathroom2 = (patch: Partial<AllRoomsState['bathroom2']>) => {
    if ('lightPower' in patch) {
      playLightClickSound(true);
    }
    setRoomsState((prev) => ({
      ...prev,
      bathroom2: { ...prev.bathroom2, ...patch },
    }));
  };

  const updateGarage = (patch: Partial<AllRoomsState['garage']>) => {
    if ('garageDoorOpen' in patch) {
      playDoorSound('garageDoor', Boolean(patch.garageDoorOpen));
    }
    if ('lightPower' in patch) {
      playLightClickSound(true);
    }
    setRoomsState((prev) => ({
      ...prev,
      garage: { ...prev.garage, ...patch },
    }));
  };

  return (
    <section id="quick-dashboard-section" className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10">
      <ScrollReveal delay={0.08} distance={20}>
        <div
          id="main-dashboard"
          className="bg-[#121212]/90 border border-stone-800 backdrop-blur-md rounded-3xl p-4 sm:p-8 flex flex-col gap-6 sm:gap-8 shadow-2xl"
        >
          {/* Section Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs font-mono text-stone-400">
              <SlidersHorizontal className="w-3.5 h-3.5 text-stone-300" />
              <span>Telemetry & Zone Matrix</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif-heading font-bold tracking-wide text-stone-100">
              Zone Control Center
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              Direct physical controls for doors, climate, and appliances across all 9 zones.
            </p>
          </div>

          {/* Header Controls: Unit Toggle & Voice Hub Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Global Temperature Unit Toggle */}
            {setTempUnit && (
              <div
                id="global-temp-unit-toggle"
                className="flex items-center p-1 rounded-xl bg-stone-950 border border-stone-800"
              >
                <button
                  id="temp-unit-fahrenheit-btn"
                  onClick={() => setTempUnit('F')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    tempUnit === 'F'
                      ? 'bg-stone-100 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Display in Fahrenheit (°F)"
                >
                  °F
                </button>
                <button
                  id="temp-unit-celsius-btn"
                  onClick={() => setTempUnit('C')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    tempUnit === 'C'
                      ? 'bg-stone-100 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Display in Celsius (°C)"
                >
                  °C
                </button>
              </div>
            )}

            {/* Quick Access Home Button */}
            <button
              id="access-home-header-btn"
              onClick={onAccessHome}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-950 font-bold uppercase tracking-wider text-xs transition-all shadow-md cursor-pointer active:scale-95 shrink-0"
            >
              <span>Open Voice & 3D Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Persistent Power Telemetry Widget */}
        <PowerMeterWidget roomsState={roomsState} />

        {/* Autonomous Home Routines Quick Bar */}
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Routine 1: Goodnight */}
            <button
              id="dashboard-routine-goodnight"
              type="button"
              onClick={handleTriggerGoodnight}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-900/90 hover:bg-stone-800/90 border border-stone-800 hover:border-stone-600 text-left transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0 group-hover:border-stone-700">
                <Moon className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-200 group-hover:text-white truncate">
                  Goodnight
                </div>
                <div className="text-[10px] text-stone-400 font-mono truncate">
                  Eco AC + power down
                </div>
              </div>
            </button>

            {/* Routine 2: Bath Time */}
            <button
              id="dashboard-routine-bath-time"
              type="button"
              onClick={handleTriggerBathTime}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-900/90 hover:bg-stone-800/90 border border-stone-800 hover:border-stone-600 text-left transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0 group-hover:border-stone-700">
                <Bath className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-200 group-hover:text-white truncate">
                  Bath Time
                </div>
                <div className="text-[10px] text-stone-400 font-mono truncate">
                  Light on + house off
                </div>
              </div>
            </button>

            {/* Routine 3: Leaving Home */}
            <button
              id="dashboard-routine-leaving-home"
              type="button"
              onClick={handleTriggerLeavingHome}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-900/90 hover:bg-stone-800/90 border border-stone-800 hover:border-stone-600 text-left transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0 group-hover:border-stone-700">
                <LogOut className="w-4 h-4 text-rose-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-200 group-hover:text-white truncate">
                  Leaving Home
                </div>
                <div className="text-[10px] text-stone-400 font-mono truncate">
                  Secure & shutdown
                </div>
              </div>
            </button>

            {/* Routine 4: Entering Home */}
            <button
              id="dashboard-routine-entering-home"
              type="button"
              onClick={handleTriggerEnteringHome}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-900/90 hover:bg-stone-800/90 border border-stone-800 hover:border-stone-600 text-left transition-all active:scale-[0.98] cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0 group-hover:border-stone-700">
                <LogIn className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-200 group-hover:text-white truncate">
                  Entering Home
                </div>
                <div className="text-[10px] text-stone-400 font-mono truncate">
                  Living AC & fan (low)
                </div>
              </div>
            </button>
          </div>

          {/* Routine Active Banner Notice */}
          <AnimatePresence>
            {activeRoutineNotice && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-stone-900 border border-stone-700 flex items-center gap-2.5 text-xs text-stone-100 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="flex-1">{activeRoutineNotice}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Room Selector Tab Bar */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.2em] text-stone-500 uppercase font-mono">
              SELECT ZONE ({ROOMS.length} ROOMS)
            </span>
            <span className="text-xs font-mono text-stone-400">
              Active: <strong className="text-stone-100 font-sans">{activeRoom.name}</strong>
            </span>
          </div>

          <div
            id="room-tabs-bar"
            className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none snap-x"
          >
            {ROOMS.map((room) => {
              const Icon = room.icon;
              const isActive = activeRoomId === room.id;
              return (
                <button
                  key={room.id}
                  id={`room-tab-${room.id}`}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer snap-start font-mono ${
                    isActive
                      ? 'bg-stone-800 text-stone-100 border-stone-600 shadow-md'
                      : 'bg-stone-950/80 text-stone-400 border-stone-800/80 hover:bg-stone-800 hover:text-stone-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-stone-200' : 'text-stone-500'}`} />
                  <span>{room.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Room Devices Stage with Transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRoomId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full space-y-4 sm:space-y-6"
          >
            {/* Room Hero Banner */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-stone-950/80 border border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-center text-stone-300 shrink-0">
                  <activeRoom.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-100 uppercase tracking-wide font-serif-heading">
                    {activeRoom.name}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Dedicated connected endpoints in this zone
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-stone-300 bg-stone-900 border border-stone-700 px-2 py-0.5 rounded-full uppercase">
                  ONLINE
                </span>
                <span className="hidden sm:inline text-[10px] font-mono text-stone-500 bg-stone-950 px-2 py-0.5 rounded-full border border-stone-800">
                  {activeRoom.badge}
                </span>
              </div>
            </div>

            {/* 1. LIVING ROOM */}
            {activeRoomId === 'living-room' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Overhead Light */}
                <LightDimmerCard
                  idPrefix="living-light"
                  title="Living Room Light"
                  subtitle="Primary Overhead Sconce"
                  isOn={roomsState.livingRoom.lightPower}
                  intensity={roomsState.livingRoom.lightIntensity ?? 100}
                  onToggle={() => {
                    const nextPower = !roomsState.livingRoom.lightPower;
                    updateLiving({
                      lightPower: nextPower,
                      lightIntensity: nextPower ? (roomsState.livingRoom.lightIntensity || 100) : roomsState.livingRoom.lightIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateLiving({
                      lightIntensity: val,
                      lightPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Living Room Light"
                />

                {/* Main Door */}
                <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  roomsState.livingRoom.mainDoorOpen
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'bg-white/[0.02] border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
                      {roomsState.livingRoom.mainDoorOpen ? (
                        <DoorOpen className="w-5 h-5 text-amber-400" />
                      ) : (
                        <DoorClosed className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <button
                      id="living-door-toggle"
                      onClick={() => updateLiving({ mainDoorOpen: !roomsState.livingRoom.mainDoorOpen })}
                      className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                        roomsState.livingRoom.mainDoorOpen ? 'bg-amber-500' : 'bg-white/20'
                      }`}
                      aria-label="Toggle Main Door"
                    >
                      <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                        roomsState.livingRoom.mainDoorOpen ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-0.5">
                    Main Entrance Door
                  </h4>
                  <p className="text-xs text-white/50 mb-3">Perimeter Smart Deadbolt</p>
                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-white/40">LOCK STATE:</span>
                    <span className={roomsState.livingRoom.mainDoorOpen ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {roomsState.livingRoom.mainDoorOpen ? 'AJAR / UNLOCKED' : 'SECURELY LOCKED'}
                    </span>
                  </div>
                </div>

                {/* Ceiling Fan */}
                <FanSpeedCard
                  idPrefix="living-fan"
                  title="Ceiling Fan"
                  subtitle="Whisper Quiet Aerodynamics"
                  isOn={roomsState.livingRoom.fanPower}
                  speed={roomsState.livingRoom.fanSpeed}
                  mode={roomsState.livingRoom.fanMode}
                  onToggle={() => {
                    const nextPower = !roomsState.livingRoom.fanPower;
                    updateLiving({
                      fanPower: nextPower,
                      fanMode: nextPower ? 'med' : 'off',
                      fanSpeed: nextPower ? (roomsState.livingRoom.fanSpeed || 60) : 0,
                    });
                  }}
                  onChangeSpeed={(speed, mode) => {
                    updateLiving({
                      fanSpeed: speed,
                      fanMode: mode,
                      fanPower: speed > 0,
                    });
                  }}
                  ariaLabel="Toggle Living Room Fan"
                />

                {/* Living AC */}
                <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                  roomsState.livingRoom.acPower
                    ? 'bg-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                    : 'bg-white/[0.02] border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
                      <ThermometerSnowflake className={`w-5 h-5 ${roomsState.livingRoom.acPower ? 'text-blue-400' : 'text-white/40'}`} />
                    </div>
                    <button
                      id="living-ac-power-toggle"
                      onClick={() => updateLiving({ acPower: !roomsState.livingRoom.acPower })}
                      className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                        roomsState.livingRoom.acPower ? 'bg-blue-600' : 'bg-white/20'
                      }`}
                      aria-label="Toggle Living Room AC"
                    >
                      <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                        roomsState.livingRoom.acPower ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      Living HVAC AC
                    </h4>
                    <span className="text-base sm:text-lg font-mono font-black text-blue-400">
                      {roomsState.livingRoom.acPower ? formatTemperature(roomsState.livingRoom.acTemp, tempUnit) : 'ECO'}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mb-3">
                    {roomsState.livingRoom.acPower ? 'Active Climate Control' : 'Standby / Low Power'}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/10">
                    <button
                      disabled={!roomsState.livingRoom.acPower}
                      onClick={() => handleAcTempChange('livingRoom', 'Living Room', roomsState.livingRoom.acTemp - 1, roomsState.livingRoom.acTemp)}
                      className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="text-[10px] font-mono text-white/60 uppercase">Temp</span>
                    <button
                      disabled={!roomsState.livingRoom.acPower}
                      onClick={() => handleAcTempChange('livingRoom', 'Living Room', roomsState.livingRoom.acTemp + 1, roomsState.livingRoom.acTemp)}
                      className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MASTER BEDROOM */}
            {activeRoomId === 'bedroom-main' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Ceiling Light */}
                <LightDimmerCard
                  idPrefix="bedroom-main-light"
                  title="Master Light"
                  subtitle="Overhead Ceiling Sconce"
                  isOn={roomsState.bedroomMain.lightPower}
                  intensity={roomsState.bedroomMain.lightIntensity ?? 100}
                  onToggle={() => {
                    const nextPower = !roomsState.bedroomMain.lightPower;
                    updateBedroomMain({
                      lightPower: nextPower,
                      lightIntensity: nextPower ? (roomsState.bedroomMain.lightIntensity || 100) : roomsState.bedroomMain.lightIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateBedroomMain({
                      lightIntensity: val,
                      lightPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Master Bedroom Light"
                />

                {/* Lamp 1 */}
                <LightDimmerCard
                  idPrefix="bedroom-main-lamp1"
                  title="Left Bedside Lamp"
                  subtitle="Warm Nightstand Glow"
                  icon={Lightbulb}
                  isOn={roomsState.bedroomMain.lamp1Power}
                  intensity={roomsState.bedroomMain.lamp1Intensity ?? 80}
                  onToggle={() => {
                    const nextPower = !roomsState.bedroomMain.lamp1Power;
                    updateBedroomMain({
                      lamp1Power: nextPower,
                      lamp1Intensity: nextPower ? (roomsState.bedroomMain.lamp1Intensity || 80) : roomsState.bedroomMain.lamp1Intensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateBedroomMain({
                      lamp1Intensity: val,
                      lamp1Power: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Left Bedside Lamp"
                />

                {/* Lamp 2 */}
                <LightDimmerCard
                  idPrefix="bedroom-main-lamp2"
                  title="Right Bedside Lamp"
                  subtitle="Warm Nightstand Glow"
                  icon={Lightbulb}
                  isOn={roomsState.bedroomMain.lamp2Power}
                  intensity={roomsState.bedroomMain.lamp2Intensity ?? 80}
                  onToggle={() => {
                    const nextPower = !roomsState.bedroomMain.lamp2Power;
                    updateBedroomMain({
                      lamp2Power: nextPower,
                      lamp2Intensity: nextPower ? (roomsState.bedroomMain.lamp2Intensity || 80) : roomsState.bedroomMain.lamp2Intensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateBedroomMain({
                      lamp2Intensity: val,
                      lamp2Power: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Right Bedside Lamp"
                />

                {/* Master AC */}
                <div className={`p-5 rounded-2xl border transition-all ${
                  roomsState.bedroomMain.acPower ? 'bg-blue-600/10 border-blue-500/40' : 'bg-white/[0.02] border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <ThermometerSnowflake className={`w-5 h-5 ${roomsState.bedroomMain.acPower ? 'text-blue-400' : 'text-white/40'}`} />
                    <span className="text-base font-mono font-bold text-blue-400">
                      {roomsState.bedroomMain.acPower ? formatTemperature(roomsState.bedroomMain.acTemp, tempUnit) : 'OFF'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Master AC
                  </h4>
                  <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-white/10">
                    <button
                      disabled={!roomsState.bedroomMain.acPower}
                      onClick={() => handleAcTempChange('bedroomMain', 'Master Suite', roomsState.bedroomMain.acTemp - 1, roomsState.bedroomMain.acTemp)}
                      className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateBedroomMain({ acPower: !roomsState.bedroomMain.acPower })}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded ${
                        roomsState.bedroomMain.acPower ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {roomsState.bedroomMain.acPower ? 'ON' : 'OFF'}
                    </button>
                    <button
                      disabled={!roomsState.bedroomMain.acPower}
                      onClick={() => handleAcTempChange('bedroomMain', 'Master Suite', roomsState.bedroomMain.acTemp + 1, roomsState.bedroomMain.acTemp)}
                      className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. BEDROOM 2 */}
            {activeRoomId === 'bedroom-2' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Light */}
                <LightDimmerCard
                  idPrefix="bedroom-2-light"
                  title="Ceiling Light"
                  subtitle="Primary Guest Light"
                  isOn={roomsState.bedroom2.lightPower}
                  intensity={roomsState.bedroom2.lightIntensity ?? 100}
                  onToggle={() => {
                    const nextPower = !roomsState.bedroom2.lightPower;
                    updateBedroom2({
                      lightPower: nextPower,
                      lightIntensity: nextPower ? (roomsState.bedroom2.lightIntensity || 100) : roomsState.bedroom2.lightIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateBedroom2({
                      lightIntensity: val,
                      lightPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Bedroom 2 Light"
                />

                {/* Desk Lamp */}
                <LightDimmerCard
                  idPrefix="bedroom-2-lamp"
                  title="Desk Lamp"
                  subtitle="Focused Work Illumination"
                  icon={Lightbulb}
                  isOn={roomsState.bedroom2.lampPower}
                  intensity={roomsState.bedroom2.lampIntensity ?? 80}
                  onToggle={() => {
                    const nextPower = !roomsState.bedroom2.lampPower;
                    updateBedroom2({
                      lampPower: nextPower,
                      lampIntensity: nextPower ? (roomsState.bedroom2.lampIntensity || 80) : roomsState.bedroom2.lampIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateBedroom2({
                      lampIntensity: val,
                      lampPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Desk Lamp"
                />

                {/* Fan */}
                <FanSpeedCard
                  idPrefix="bedroom-2-fan"
                  title="Ceiling Fan"
                  subtitle="Guest Room Aerodynamics"
                  isOn={roomsState.bedroom2.fanPower}
                  speed={roomsState.bedroom2.fanSpeed}
                  mode={roomsState.bedroom2.fanMode}
                  onToggle={() => {
                    const nextPower = !roomsState.bedroom2.fanPower;
                    updateBedroom2({
                      fanPower: nextPower,
                      fanMode: nextPower ? 'med' : 'off',
                      fanSpeed: nextPower ? (roomsState.bedroom2.fanSpeed || 60) : 0,
                    });
                  }}
                  onChangeSpeed={(speed, mode) => {
                    updateBedroom2({
                      fanSpeed: speed,
                      fanMode: mode,
                      fanPower: speed > 0,
                    });
                  }}
                  ariaLabel="Toggle Bedroom 2 Fan"
                />

                {/* AC */}
                <div className={`p-5 rounded-2xl border ${roomsState.bedroom2.acPower ? 'bg-blue-600/10 border-blue-500/40' : 'bg-white/[0.02] border-white/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <ThermometerSnowflake className={`w-5 h-5 ${roomsState.bedroom2.acPower ? 'text-blue-400' : 'text-white/40'}`} />
                    <span className="text-base font-mono font-bold text-blue-400">
                      {roomsState.bedroom2.acPower ? formatTemperature(roomsState.bedroom2.acTemp, tempUnit) : 'OFF'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Bedroom 2 AC</h4>
                  <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-white/10">
                    <button
                      disabled={!roomsState.bedroom2.acPower}
                      onClick={() => handleAcTempChange('bedroom2', 'Bedroom 2', roomsState.bedroom2.acTemp - 1, roomsState.bedroom2.acTemp)}
                      className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateBedroom2({ acPower: !roomsState.bedroom2.acPower })}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded ${
                        roomsState.bedroom2.acPower ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {roomsState.bedroom2.acPower ? 'ON' : 'OFF'}
                    </button>
                    <button
                      disabled={!roomsState.bedroom2.acPower}
                      onClick={() => handleAcTempChange('bedroom2', 'Bedroom 2', roomsState.bedroom2.acTemp + 1, roomsState.bedroom2.acTemp)}
                      className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. BEDROOM 3 / STUDIO */}
            {activeRoomId === 'bedroom-3' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <LightDimmerCard
                  idPrefix="bedroom-3-light"
                  title="Studio Light"
                  subtitle="Office Ambient Fixture"
                  isOn={roomsState.bedroom3.lightPower}
                  intensity={roomsState.bedroom3.lightIntensity ?? 100}
                  onToggle={() => {
                    const nextPower = !roomsState.bedroom3.lightPower;
                    updateBedroom3({
                      lightPower: nextPower,
                      lightIntensity: nextPower ? (roomsState.bedroom3.lightIntensity || 100) : roomsState.bedroom3.lightIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateBedroom3({
                      lightIntensity: val,
                      lightPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Studio Light"
                />

                <LightDimmerCard
                  idPrefix="bedroom-3-lamp"
                  title="Floor Lamp"
                  subtitle="Warm Corner Illumination"
                  icon={Lightbulb}
                  isOn={roomsState.bedroom3.lampPower}
                  intensity={roomsState.bedroom3.lampIntensity ?? 70}
                  onToggle={() => {
                    const nextPower = !roomsState.bedroom3.lampPower;
                    updateBedroom3({
                      lampPower: nextPower,
                      lampIntensity: nextPower ? (roomsState.bedroom3.lampIntensity || 70) : roomsState.bedroom3.lampIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateBedroom3({
                      lampIntensity: val,
                      lampPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Floor Lamp"
                />

                <div className={`p-5 rounded-2xl border ${roomsState.bedroom3.acPower ? 'bg-blue-600/10 border-blue-500/40' : 'bg-white/[0.02] border-white/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <ThermometerSnowflake className={`w-5 h-5 ${roomsState.bedroom3.acPower ? 'text-blue-400' : 'text-white/40'}`} />
                    <span className="text-base font-mono font-bold text-blue-400">
                      {roomsState.bedroom3.acPower ? formatTemperature(roomsState.bedroom3.acTemp, tempUnit) : 'OFF'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Studio AC</h4>
                  <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-white/10">
                    <button
                      disabled={!roomsState.bedroom3.acPower}
                      onClick={() => handleAcTempChange('bedroom3', 'Bedroom 3', roomsState.bedroom3.acTemp - 1, roomsState.bedroom3.acTemp)}
                      className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateBedroom3({ acPower: !roomsState.bedroom3.acPower })}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded ${
                        roomsState.bedroom3.acPower ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {roomsState.bedroom3.acPower ? 'ON' : 'OFF'}
                    </button>
                    <button
                      disabled={!roomsState.bedroom3.acPower}
                      onClick={() => handleAcTempChange('bedroom3', 'Bedroom 3', roomsState.bedroom3.acTemp + 1, roomsState.bedroom3.acTemp)}
                      className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. DINING ROOM */}
            {activeRoomId === 'dining-room' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <LightDimmerCard
                  idPrefix="dining-light"
                  title="Dining Chandelier"
                  subtitle="Multi-Bulb Warm Pendant"
                  isOn={roomsState.diningRoom.lightPower}
                  intensity={roomsState.diningRoom.lightIntensity ?? 100}
                  onToggle={() => {
                    const nextPower = !roomsState.diningRoom.lightPower;
                    updateDining({
                      lightPower: nextPower,
                      lightIntensity: nextPower ? (roomsState.diningRoom.lightIntensity || 100) : roomsState.diningRoom.lightIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateDining({
                      lightIntensity: val,
                      lightPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Dining Chandelier"
                />

                <div className={`p-5 rounded-2xl border ${roomsState.diningRoom.acPower ? 'bg-blue-600/10 border-blue-500/40' : 'bg-white/[0.02] border-white/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <ThermometerSnowflake className={`w-5 h-5 ${roomsState.diningRoom.acPower ? 'text-blue-400' : 'text-white/40'}`} />
                    <span className="text-base font-mono font-bold text-blue-400">
                      {roomsState.diningRoom.acPower ? formatTemperature(roomsState.diningRoom.acTemp, tempUnit) : 'OFF'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Dining AC</h4>
                  <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-white/10">
                    <button
                      disabled={!roomsState.diningRoom.acPower}
                      onClick={() => handleAcTempChange('diningRoom', 'Dining Room', roomsState.diningRoom.acTemp - 1, roomsState.diningRoom.acTemp)}
                      className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateDining({ acPower: !roomsState.diningRoom.acPower })}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded ${
                        roomsState.diningRoom.acPower ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {roomsState.diningRoom.acPower ? 'ON' : 'OFF'}
                    </button>
                    <button
                      disabled={!roomsState.diningRoom.acPower}
                      onClick={() => handleAcTempChange('diningRoom', 'Dining Room', roomsState.diningRoom.acTemp + 1, roomsState.diningRoom.acTemp)}
                      className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. KITCHEN */}
            {activeRoomId === 'kitchen' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {/* Kitchen Overhead & Task Light */}
                <LightDimmerCard
                  idPrefix="kitchen-light"
                  title="Kitchen Light"
                  subtitle="Under-Cabinet & Island Task Light"
                  isOn={roomsState.kitchen.lightPower}
                  intensity={roomsState.kitchen.lightIntensity ?? 100}
                  onToggle={() => {
                    const nextPower = !roomsState.kitchen.lightPower;
                    updateKitchen({
                      lightPower: nextPower,
                      lightIntensity: nextPower ? (roomsState.kitchen.lightIntensity || 100) : roomsState.kitchen.lightIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateKitchen({
                      lightIntensity: val,
                      lightPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Kitchen Light"
                />

                <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${roomsState.kitchen.chimneyPower ? 'bg-blue-600/10 border-blue-500/40' : 'bg-white/[0.02] border-white/10'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <Flame className={`w-5 h-5 ${roomsState.kitchen.chimneyPower ? 'text-amber-400' : 'text-white/40'}`} />
                    <button
                      onClick={() => updateKitchen({ chimneyPower: !roomsState.kitchen.chimneyPower })}
                      className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors ${
                        roomsState.kitchen.chimneyPower ? 'bg-emerald-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`bg-white w-5 h-5 rounded-full transform ${roomsState.kitchen.chimneyPower ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-0.5">Range Hood Chimney</h4>
                  <p className="text-xs text-white/50 mb-3">Fume Extraction Motor</p>
                  <div className="grid grid-cols-4 gap-1 pt-2 border-t border-white/10">
                    {(['low', 'med', 'high', 'turbo'] as const).map((spd) => (
                      <button
                        key={spd}
                        disabled={!roomsState.kitchen.chimneyPower}
                        onClick={() => updateKitchen({ chimneySpeed: spd })}
                        className={`py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${
                          roomsState.kitchen.chimneySpeed === spd && roomsState.kitchen.chimneyPower
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-white/5 text-white/40 hover:text-white disabled:opacity-30'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border ${roomsState.kitchen.windowOpen ? 'bg-amber-950/20 border-amber-500/40' : 'bg-white/[0.02] border-white/10'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <Layers className={`w-5 h-5 ${roomsState.kitchen.windowOpen ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <button
                      onClick={() => updateKitchen({ windowOpen: !roomsState.kitchen.windowOpen })}
                      className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors ${
                        roomsState.kitchen.windowOpen ? 'bg-amber-500' : 'bg-white/20'
                      }`}
                    >
                      <div className={`bg-white w-5 h-5 rounded-full transform ${roomsState.kitchen.windowOpen ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-0.5">Kitchen Sliding Window</h4>
                  <p className="text-xs text-white/50 mb-3">Ventilation & Weather Barrier</p>
                  <div className="pt-2 border-t border-white/10 flex justify-between text-xs font-mono">
                    <span className="text-white/40">STATUS:</span>
                    <span className={roomsState.kitchen.windowOpen ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {roomsState.kitchen.windowOpen ? 'OPEN (VENTING)' : 'CLOSED (SEALED)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 7. BATHROOM MAIN */}
            {activeRoomId === 'bathroom-main' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <LightDimmerCard
                  idPrefix="bathroom-main-light"
                  title="Vanity Light"
                  subtitle="Mirror & Ambient Lighting"
                  isOn={roomsState.bathroomMain.lightPower}
                  intensity={roomsState.bathroomMain.lightIntensity ?? 100}
                  onToggle={() => {
                    const nextPower = !roomsState.bathroomMain.lightPower;
                    updateBathroomMain({
                      lightPower: nextPower,
                      lightIntensity: nextPower ? (roomsState.bathroomMain.lightIntensity || 100) : roomsState.bathroomMain.lightIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateBathroomMain({
                      lightIntensity: val,
                      lightPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Vanity Light"
                />

                <FanSpeedCard
                  idPrefix="bathroom-main-exhaust"
                  title="Moisture Exhaust"
                  subtitle="Humidity Extraction Fan"
                  isOn={roomsState.bathroomMain.exhaustFanPower}
                  speed={roomsState.bathroomMain.exhaustFanSpeed ?? 60}
                  mode={roomsState.bathroomMain.exhaustFanMode ?? 'med'}
                  onToggle={() => {
                    const nextPower = !roomsState.bathroomMain.exhaustFanPower;
                    updateBathroomMain({
                      exhaustFanPower: nextPower,
                      exhaustFanMode: nextPower ? 'med' : 'off',
                      exhaustFanSpeed: nextPower ? (roomsState.bathroomMain.exhaustFanSpeed || 60) : 0,
                    });
                  }}
                  onChangeSpeed={(speed, mode) => {
                    updateBathroomMain({
                      exhaustFanSpeed: speed,
                      exhaustFanMode: mode,
                      exhaustFanPower: speed > 0,
                    });
                  }}
                  ariaLabel="Toggle Bathroom Exhaust Fan"
                />
              </div>
            )}

            {/* 8. BATHROOM 2 */}
            {activeRoomId === 'bathroom-2' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <LightDimmerCard
                  idPrefix="bathroom-2-light"
                  title="Shower Light"
                  subtitle="Guest Bath Fixture"
                  isOn={roomsState.bathroom2.lightPower}
                  intensity={roomsState.bathroom2.lightIntensity ?? 100}
                  onToggle={() => {
                    const nextPower = !roomsState.bathroom2.lightPower;
                    updateBathroom2({
                      lightPower: nextPower,
                      lightIntensity: nextPower ? (roomsState.bathroom2.lightIntensity || 100) : roomsState.bathroom2.lightIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateBathroom2({
                      lightIntensity: val,
                      lightPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Shower Light"
                />

                <FanSpeedCard
                  idPrefix="bathroom-2-exhaust"
                  title="Moisture Exhaust"
                  subtitle="Guest Bath Humidity Fan"
                  isOn={roomsState.bathroom2.exhaustFanPower}
                  speed={roomsState.bathroom2.exhaustFanSpeed ?? 50}
                  mode={roomsState.bathroom2.exhaustFanMode ?? 'low'}
                  onToggle={() => {
                    const nextPower = !roomsState.bathroom2.exhaustFanPower;
                    updateBathroom2({
                      exhaustFanPower: nextPower,
                      exhaustFanMode: nextPower ? 'low' : 'off',
                      exhaustFanSpeed: nextPower ? (roomsState.bathroom2.exhaustFanSpeed || 50) : 0,
                    });
                  }}
                  onChangeSpeed={(speed, mode) => {
                    updateBathroom2({
                      exhaustFanSpeed: speed,
                      exhaustFanMode: mode,
                      exhaustFanPower: speed > 0,
                    });
                  }}
                  ariaLabel="Toggle Bathroom 2 Exhaust Fan"
                />
              </div>
            )}

            {/* 9. GARAGE */}
            {activeRoomId === 'garage' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <LightDimmerCard
                  idPrefix="garage-light"
                  title="Bay Overhead Light"
                  subtitle="High-Lumen Workshop Fixture"
                  isOn={roomsState.garage.lightPower}
                  intensity={roomsState.garage.lightIntensity ?? 100}
                  onToggle={() => {
                    const nextPower = !roomsState.garage.lightPower;
                    updateGarage({
                      lightPower: nextPower,
                      lightIntensity: nextPower ? (roomsState.garage.lightIntensity || 100) : roomsState.garage.lightIntensity,
                    });
                  }}
                  onChangeIntensity={(val) => {
                    updateGarage({
                      lightIntensity: val,
                      lightPower: val > 0,
                    });
                  }}
                  ariaLabel="Toggle Bay Overhead Light"
                />

                <div className={`p-5 rounded-2xl border ${roomsState.garage.garageDoorOpen ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'bg-white/[0.02] border-white/10'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <Warehouse className={`w-5 h-5 ${roomsState.garage.garageDoorOpen ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <span className={`text-xs font-mono font-bold ${roomsState.garage.garageDoorOpen ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {roomsState.garage.garageDoorOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-0.5">Motorized Barrier</h4>
                  <p className="text-xs text-white/50 mb-3">Roll-up Vehicle Portal</p>
                  <button
                    id="garage-door-toggle-btn"
                    onClick={() => updateGarage({ garageDoorOpen: !roomsState.garage.garageDoorOpen })}
                    className={`w-full py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      roomsState.garage.garageDoorOpen
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                  >
                    {roomsState.garage.garageDoorOpen ? 'Close Garage Door' : 'Open Garage Door'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Access Full Spatial Twin CTA */}
        <div className="pt-5 border-t border-white/10 flex items-center justify-end">
          <button
            id="access-home-bottom-btn"
            onClick={onAccessHome}
            className="w-full sm:w-auto py-3.5 px-7 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase tracking-[0.12em] text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>ACCESS FULL HOME</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      </ScrollReveal>
    </section>
  );
}
