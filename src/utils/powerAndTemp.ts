/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AllRoomsState, TemperatureUnit } from '../types';

/**
 * Temperature conversion utilities
 */
export function toCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9);
}

export function toFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

export function formatTemperature(fahrenheit: number, unit: TemperatureUnit): string {
  if (unit === 'C') {
    return `${toCelsius(fahrenheit)}°C`;
  }
  return `${fahrenheit}°F`;
}

export function getDisplayTemperatureValue(fahrenheit: number, unit: TemperatureUnit): number {
  if (unit === 'C') {
    return toCelsius(fahrenheit);
  }
  return fahrenheit;
}

/**
 * Check if an AC temperature setting is aggressive and should trigger power-saving suggestion
 * Aggressive: <= 64°F (18°C) in cooling, or >= 78°F (26°C) in heating
 */
export interface AcOptimizationCheck {
  isAggressive: boolean;
  suggestedTempF: number;
  message: string;
}

export function checkAcPowerSaving(
  targetTempF: number,
  _currentTempF: number
): AcOptimizationCheck {
  // If cooling aggressively (<= 64°F / 18°C)
  if (targetTempF <= 64) {
    return {
      isAggressive: true,
      suggestedTempF: 72, // 22°C (Industry recommended eco-comfort standard)
      message: 'Cooling below 64°F (18°C) causes maximum compressor workload and dramatically spikes energy usage.',
    };
  }
  // If heating aggressively (>= 78°F / 26°C)
  if (targetTempF >= 78) {
    return {
      isAggressive: true,
      suggestedTempF: 70, // 21°C
      message: 'Heating above 78°F (26°C) requires sustained high-draw resistive cycles.',
    };
  }

  return {
    isAggressive: false,
    suggestedTempF: targetTempF,
    message: '',
  };
}

/**
 * Live Power Usage Meter Calculation
 * Baseline stand-by draw + sum of all active connected devices
 */
export interface PowerUsageTelemetry {
  totalWatts: number;
  totalKilowatts: number;
  activeDeviceCount: number;
  loadLevel: 'eco' | 'normal' | 'elevated' | 'heavy';
  breakdown: {
    hvac: number;
    lighting: number;
    appliances: number;
    standby: number;
  };
}

export function calculatePowerUsage(state: AllRoomsState): PowerUsageTelemetry {
  // Standby home hub base load (sensors, cameras, router, mesh nodes)
  const STANDBY_WATTS = 115;

  let hvacWatts = 0;
  let lightingWatts = 0;
  let applianceWatts = 0;
  let activeCount = 0;

  // 1. Living Room
  if (state.livingRoom.lightPower) {
    activeCount++;
    lightingWatts += 45;
  }
  if (state.livingRoom.acPower) {
    activeCount++;
    const tempDelta = Math.max(0, 75 - state.livingRoom.acTemp);
    hvacWatts += 1150 + tempDelta * 35;
  }
  if (state.livingRoom.fanPower) {
    activeCount++;
    const speedRatio = (state.livingRoom.fanSpeed || 50) / 100;
    applianceWatts += 15 + Math.round(speedRatio * 45); // 15W - 60W
  }
  if (state.livingRoom.mainDoorOpen) {
    applianceWatts += 8;
  }

  // 2. Master Bedroom
  if (state.bedroomMain.acPower) {
    activeCount++;
    const tempDelta = Math.max(0, 75 - state.bedroomMain.acTemp);
    hvacWatts += 1050 + tempDelta * 30;
  }
  if (state.bedroomMain.lightPower) {
    activeCount++;
    lightingWatts += 35;
  }
  if (state.bedroomMain.lamp1Power) {
    activeCount++;
    lightingWatts += Math.round(((state.bedroomMain.lamp1Intensity || 50) / 100) * 25);
  }
  if (state.bedroomMain.lamp2Power) {
    activeCount++;
    lightingWatts += Math.round(((state.bedroomMain.lamp2Intensity || 50) / 100) * 25);
  }

  // 3. Bedroom 2
  if (state.bedroom2.acPower) {
    activeCount++;
    const tempDelta = Math.max(0, 75 - state.bedroom2.acTemp);
    hvacWatts += 950 + tempDelta * 25;
  }
  if (state.bedroom2.lightPower) {
    activeCount++;
    lightingWatts += 30;
  }
  if (state.bedroom2.lampPower) {
    activeCount++;
    lightingWatts += Math.round(((state.bedroom2.lampIntensity || 50) / 100) * 20);
  }
  if (state.bedroom2.fanPower) {
    activeCount++;
    const speedRatio = (state.bedroom2.fanSpeed || 50) / 100;
    applianceWatts += 12 + Math.round(speedRatio * 38);
  }

  // 4. Bedroom 3 / Studio
  if (state.bedroom3.acPower) {
    activeCount++;
    const tempDelta = Math.max(0, 75 - state.bedroom3.acTemp);
    hvacWatts += 950 + tempDelta * 25;
  }
  if (state.bedroom3.lightPower) {
    activeCount++;
    lightingWatts += 30;
  }
  if (state.bedroom3.lampPower) {
    activeCount++;
    lightingWatts += Math.round(((state.bedroom3.lampIntensity || 50) / 100) * 20);
  }

  // 5. Dining Room
  if (state.diningRoom.acPower) {
    activeCount++;
    const tempDelta = Math.max(0, 75 - state.diningRoom.acTemp);
    hvacWatts += 1100 + tempDelta * 30;
  }
  if (state.diningRoom.lightPower) {
    activeCount++;
    lightingWatts += 75; // Dining chandelier multi-bulb
  }

  // 6. Kitchen
  if (state.kitchen.lightPower) {
    activeCount++;
    lightingWatts += 35;
  }
  if (state.kitchen.chimneyPower) {
    activeCount++;
    const speed = state.kitchen.chimneySpeed;
    const chimneyMap: Record<string, number> = {
      low: 120,
      med: 180,
      high: 240,
      turbo: 320,
    };
    applianceWatts += chimneyMap[speed] || 180;
  }

  // 7. Bathroom Main (Bath 1)
  if (state.bathroomMain.lightPower) {
    activeCount++;
    lightingWatts += 25;
  }
  if (state.bathroomMain.exhaustFanPower) {
    activeCount++;
    applianceWatts += 50;
  }

  // 8. Bathroom 2
  if (state.bathroom2.lightPower) {
    activeCount++;
    lightingWatts += 25;
  }
  if (state.bathroom2.exhaustFanPower) {
    activeCount++;
    applianceWatts += 50;
  }

  // 9. Garage
  if (state.garage.lightPower) {
    activeCount++;
    lightingWatts += 55; // High-lumen overhead bay fixture
  }
  if (state.garage.garageDoorOpen) {
    applianceWatts += 45; // Open motorized track indicator and obstacle sensors
  }

  const totalWatts = STANDBY_WATTS + hvacWatts + lightingWatts + applianceWatts;
  const totalKilowatts = Number((totalWatts / 1000).toFixed(2));

  let loadLevel: 'eco' | 'normal' | 'elevated' | 'heavy' = 'eco';
  if (totalWatts > 3200) {
    loadLevel = 'heavy';
  } else if (totalWatts > 1800) {
    loadLevel = 'elevated';
  } else if (totalWatts > 600) {
    loadLevel = 'normal';
  }

  return {
    totalWatts,
    totalKilowatts,
    activeDeviceCount: activeCount,
    loadLevel,
    breakdown: {
      hvac: hvacWatts,
      lighting: lightingWatts,
      appliances: applianceWatts,
      standby: STANDBY_WATTS,
    },
  };
}
