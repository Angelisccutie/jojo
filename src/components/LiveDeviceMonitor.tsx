/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import type { AllRoomsState } from '../types';
import {
  DoorClosed,
  DoorOpen,
  Fan,
  Thermometer,
  Lightbulb,
  Wind,
  Layers,
} from 'lucide-react';

interface LiveDeviceMonitorProps {
  roomsState: AllRoomsState;
}

export function LiveDeviceMonitor({ roomsState }: LiveDeviceMonitorProps) {
  const monitors = [
    {
      label: 'Front Main Door',
      location: 'Living Room',
      icon: roomsState.livingRoom.mainDoorOpen ? DoorOpen : DoorClosed,
      value: roomsState.livingRoom.mainDoorOpen ? 'UNLOCKED / OPEN' : 'SECURED / CLOSED',
      active: roomsState.livingRoom.mainDoorOpen,
      badgeColor: roomsState.livingRoom.mainDoorOpen ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      label: 'Garage Barrier',
      location: 'Garage Bay',
      icon: roomsState.garage.garageDoorOpen ? DoorOpen : DoorClosed,
      value: roomsState.garage.garageDoorOpen ? 'OPEN' : 'CLOSED',
      active: roomsState.garage.garageDoorOpen,
      badgeColor: roomsState.garage.garageDoorOpen ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      label: 'Kitchen Window',
      location: 'Kitchen',
      icon: Wind,
      value: roomsState.kitchen.windowOpen ? 'VENTILATING' : 'SHUT',
      active: roomsState.kitchen.windowOpen,
      badgeColor: roomsState.kitchen.windowOpen ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      label: 'Living Climate',
      location: 'Living Room',
      icon: Thermometer,
      value: roomsState.livingRoom.acPower ? `${roomsState.livingRoom.acTemp}°F (ACTIVE)` : 'STANDBY',
      active: roomsState.livingRoom.acPower,
      badgeColor: roomsState.livingRoom.acPower ? 'text-stone-200 bg-stone-800 border-stone-700' : 'text-stone-500 bg-stone-950 border-stone-800',
    },
    {
      label: 'Master Climate',
      location: 'Bedroom Main',
      icon: Thermometer,
      value: roomsState.bedroomMain.acPower ? `${roomsState.bedroomMain.acTemp}°F (ACTIVE)` : 'OFF',
      active: roomsState.bedroomMain.acPower,
      badgeColor: roomsState.bedroomMain.acPower ? 'text-stone-200 bg-stone-800 border-stone-700' : 'text-stone-500 bg-stone-950 border-stone-800',
    },
    {
      label: 'Living Ceiling Fan',
      location: 'Living Room',
      icon: Fan,
      value: roomsState.livingRoom.fanPower ? `${roomsState.livingRoom.fanSpeed}% (${roomsState.livingRoom.fanMode})` : 'OFF',
      active: roomsState.livingRoom.fanPower,
      badgeColor: roomsState.livingRoom.fanPower ? 'text-stone-200 bg-stone-800 border-stone-700' : 'text-stone-500 bg-stone-950 border-stone-800',
    },
    {
      label: 'Master Lights',
      location: 'Bedroom Main',
      icon: Lightbulb,
      value: roomsState.bedroomMain.lightPower ? `ON (${roomsState.bedroomMain.lightIntensity ?? 100}%)` : 'OFF',
      active: roomsState.bedroomMain.lightPower,
      badgeColor: roomsState.bedroomMain.lightPower ? 'text-stone-100 bg-stone-800 border-stone-600' : 'text-stone-500 bg-stone-950 border-stone-800',
    },
    {
      label: 'Dining Chandelier',
      location: 'Dining Room',
      icon: Lightbulb,
      value: roomsState.diningRoom.lightPower ? `ON (${roomsState.diningRoom.lightIntensity ?? 100}%)` : 'OFF',
      active: roomsState.diningRoom.lightPower,
      badgeColor: roomsState.diningRoom.lightPower ? 'text-stone-100 bg-stone-800 border-stone-600' : 'text-stone-500 bg-stone-950 border-stone-800',
    },
  ];

  return (
    <div className="w-full rounded-2xl bg-[#121212]/90 border border-stone-800 backdrop-blur-md p-4 sm:p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-stone-300" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-300 font-mono">
            Connected Endpoints
          </h3>
        </div>
        <span className="text-xs font-mono text-stone-500">
          8 Real-Time Sensors
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {monitors.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              layout
              className={`p-2.5 rounded-xl border transition-all duration-200 ${
                item.active
                  ? 'bg-stone-900 border-stone-700'
                  : 'bg-stone-950/60 border-stone-800/80 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-stone-500 truncate max-w-[90px]">
                  {item.location}
                </span>
                <Icon className={`w-3.5 h-3.5 ${item.active ? 'text-stone-300' : 'text-stone-600'}`} />
              </div>
              <p className="text-xs font-medium text-stone-200 truncate">{item.label}</p>
              <div className="mt-1.5 flex items-center gap-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${item.badgeColor}`}>
                  {item.value}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
