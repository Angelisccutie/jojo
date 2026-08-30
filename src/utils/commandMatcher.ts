/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AllRoomsState,
  PreferenceRule,
  RoutineOption,
  RoutinePromptData,
} from '../types';
import {
  GOODNIGHT_ROOM_OPTIONS,
  BATH_ROOM_OPTIONS,
  executeGoodnightRoutine,
  executeBathRoutine,
  executeLeavingHomeRoutine,
  executeEnteringHomeRoutine,
} from './routineRunner';

export type DeterministicResult =
  | {
      type: 'routine_prompt';
      promptData: RoutinePromptData;
    }
  | {
      type: 'routine_direct';
      nextState: AllRoomsState;
      logMessage: string;
      appliedUpdates: Record<string, any>;
    }
  | {
      type: 'command';
      nextState: AllRoomsState;
      logMessage: string;
      appliedUpdates: Record<string, any>;
    }
  | {
      type: 'preference';
      preference: PreferenceRule;
      logMessage: string;
    }
  | {
      type: 'unmatched';
    };

/**
 * Clean & normalize text for deterministic command matching
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\d]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Extract percentage or brightness/intensity number (0-100) from command text.
 */
function extractPercentage(text: string): number | null {
  const explicitPct = text.match(/(\d{1,3})\s*(?:%|percent)/);
  if (explicitPct && explicitPct[1]) {
    const val = parseInt(explicitPct[1], 10);
    if (!isNaN(val)) return Math.min(100, Math.max(0, val));
  }
  const match = text.match(/(?:to|at|level|intensity|brightness|set|dim|brighten)\s*(\d{1,3})/);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val)) return Math.min(100, Math.max(0, val));
  }
  const standaloneNum = text.match(/\b(\d{1,3})\b/);
  if (standaloneNum && standaloneNum[1]) {
    const val = parseInt(standaloneNum[1], 10);
    if (!isNaN(val) && val <= 100) return val;
  }
  return null;
}

/**
 * Extract fan speed (0-100), mode ('off'|'low'|'med'|'high'), and power boolean from command text.
 */
function extractFanParams(
  text: string,
  currentSpeed = 60,
  currentMode: 'off' | 'low' | 'med' | 'high' = 'med'
): {
  speed: number;
  mode: 'off' | 'low' | 'med' | 'high';
  power: boolean;
} {
  const isOff = text.includes('off') || text.includes('stop') || text.includes('shut down') || text.includes('kill');
  if (isOff) {
    return { speed: 0, mode: 'off', power: false };
  }

  const pct = extractPercentage(text);
  if (pct !== null) {
    if (pct === 0) return { speed: 0, mode: 'off', power: false };
    let mode: 'low' | 'med' | 'high' = 'med';
    if (pct > 75) mode = 'high';
    else if (pct > 35) mode = 'med';
    else mode = 'low';
    return { speed: pct, mode, power: true };
  }

  if (text.includes('high') || text.includes('max') || text.includes('fast') || text.includes('turbo')) {
    return { speed: 100, mode: 'high', power: true };
  }
  if (text.includes('low') || text.includes('slow') || text.includes('whisper')) {
    return { speed: 30, mode: 'low', power: true };
  }
  if (text.includes('med') || text.includes('medium') || text.includes('normal')) {
    return { speed: 65, mode: 'med', power: true };
  }

  // Generic "turn on" / "fan on"
  const nextSpeed = currentSpeed > 0 ? currentSpeed : 60;
  const nextMode = currentMode !== 'off' ? currentMode : 'med';
  return { speed: nextSpeed, mode: nextMode, power: true };
}

/**
 * Extract light intensity (0-100), power boolean, and whether an explicit intensity was provided.
 */
function extractLightParams(
  text: string,
  currentIntensity = 100
): {
  intensity: number;
  power: boolean;
  isExplicitIntensity: boolean;
} {
  const isOff = text.includes('off') || text.includes('shut') || text.includes('kill') || text.includes('turn off');
  if (isOff) {
    return { intensity: currentIntensity > 0 ? currentIntensity : 100, power: false, isExplicitIntensity: false };
  }

  const pct = extractPercentage(text);
  if (pct !== null) {
    if (pct === 0) return { intensity: 0, power: false, isExplicitIntensity: true };
    return { intensity: pct, power: true, isExplicitIntensity: true };
  }

  if (text.includes('dim') || text.includes('soft') || text.includes('night') || text.includes('lower')) {
    return { intensity: 30, power: true, isExplicitIntensity: true };
  }
  if (text.includes('bright') || text.includes('max') || text.includes('full')) {
    return { intensity: 100, power: true, isExplicitIntensity: true };
  }

  // Generic "turn on" preserves whatever intensity was last set
  const nextIntensity = currentIntensity > 0 ? currentIntensity : 100;
  return { intensity: nextIntensity, power: true, isExplicitIntensity: false };
}

/**
 * Match and execute deterministic device commands, bulk actions, routines, and rules.
 * Runs FIRST before any Gemini API call.
 */
export function matchAndExecuteCommand(
  rawText: string,
  currentState: AllRoomsState,
  onRequestRoutinePrompt?: (data: RoutinePromptData) => void
): DeterministicResult {
  const norm = normalize(rawText);
  if (!norm) return { type: 'unmatched' };

  // ==========================================
  // 1. ROUTINE: GOODNIGHT
  // ==========================================
  const isGoodnight =
    norm.includes('goodnight') ||
    norm.includes('good night') ||
    norm.includes('going to sleep') ||
    norm.includes('go to sleep') ||
    norm.includes('time for bed') ||
    norm.includes('bedtime') ||
    norm.includes('sleep mode') ||
    norm.includes('going to bed') ||
    norm === 'sleep';

  if (isGoodnight) {
    let explicitRoom: keyof AllRoomsState | null = null;
    let explicitLabel: string | undefined;
    if (norm.includes('living room') || norm.includes('living')) {
      explicitRoom = 'livingRoom';
      explicitLabel = 'Living Room';
    } else if (norm.includes('master') || norm.includes('main bed') || norm.includes('bedroom 1')) {
      explicitRoom = 'bedroomMain';
      explicitLabel = 'Master Suite';
    } else if (norm.includes('bedroom 2') || norm.includes('bed 2') || norm.includes('guest bed')) {
      explicitRoom = 'bedroom2';
      explicitLabel = 'Bedroom 2';
    } else if (norm.includes('bedroom 3') || norm.includes('bed 3') || norm.includes('studio')) {
      explicitRoom = 'bedroom3';
      explicitLabel = 'Studio / Bed 3';
    }

    if (explicitRoom) {
      const routineResult = executeGoodnightRoutine(currentState, explicitRoom, explicitLabel);
      return {
        type: 'routine_direct',
        nextState: routineResult.nextState,
        logMessage: routineResult.logMessage,
        appliedUpdates: routineResult.appliedUpdates,
      };
    }

    return {
      type: 'routine_prompt',
      promptData: {
        routineId: 'goodnight',
        title: 'Goodnight Routine',
        question: 'Where are you sleeping tonight?',
        subText:
          'Sets selected room AC to energy-saving eco mode (74°F) and turns off all other electronic devices across the house.',
        options: GOODNIGHT_ROOM_OPTIONS,
        onSelectOption: () => {},
        onCancel: () => {},
      },
    };
  }

  // ==========================================
  // 2. ROUTINE: BATH TIME
  // ==========================================
  const isBath =
    norm.includes('bath') ||
    norm.includes('shower') ||
    norm.includes('taking a bath') ||
    norm.includes('take a bath') ||
    norm.includes('going to the bathroom') ||
    norm.includes('bath time') ||
    norm.includes('taking a shower') ||
    norm.includes('shower time');

  const isDirectBathroomLightOrFan =
    (norm.includes('turn on') ||
      norm.includes('turn off') ||
      norm.includes('switch on') ||
      norm.includes('switch off') ||
      norm.includes('set') ||
      norm.includes('dim') ||
      norm.includes('brighten') ||
      norm.includes('speed') ||
      norm.includes('intensity') ||
      norm.includes('level') ||
      norm.includes('percent')) &&
    (norm.includes('light') || norm.includes('fan') || norm.includes('exhaust')) &&
    !norm.includes('bath time') &&
    !norm.includes('take a bath') &&
    !norm.includes('taking a bath') &&
    !norm.includes('shower time') &&
    !norm.includes('taking a shower');

  if (isBath && !isDirectBathroomLightOrFan) {
    let explicitBath: keyof AllRoomsState | null = null;
    let explicitLabel: string | undefined;
    if (norm.includes('guest') || norm.includes('bath 2') || norm.includes('bathroom 2') || norm.includes('second bath')) {
      explicitBath = 'bathroom2';
      explicitLabel = 'Guest Bath 2';
    } else if (norm.includes('main bath') || norm.includes('master bath') || norm.includes('bath 1') || norm.includes('bathroom 1')) {
      explicitBath = 'bathroomMain';
      explicitLabel = 'Main Bathroom';
    }

    if (explicitBath) {
      const routineResult = executeBathRoutine(currentState, explicitBath, explicitLabel);
      return {
        type: 'routine_direct',
        nextState: routineResult.nextState,
        logMessage: routineResult.logMessage,
        appliedUpdates: routineResult.appliedUpdates,
      };
    }

    return {
      type: 'routine_prompt',
      promptData: {
        routineId: 'bath_time',
        title: 'Bath Time Routine',
        question: 'Which bathroom are you using?',
        subText:
          'Turns on the selected bathroom light and powers down all other devices across the entire house.',
        options: BATH_ROOM_OPTIONS,
        onSelectOption: () => {},
        onCancel: () => {},
      },
    };
  }

  // ==========================================
  // 3. ROUTINE: LEAVING HOME
  // ==========================================
  const isLeaving =
    norm.includes('leaving home') ||
    norm.includes('leaving the house') ||
    norm.includes('im leaving') ||
    norm.includes('i am leaving') ||
    norm.includes('goodbye house') ||
    norm.includes('goodbye') ||
    norm.includes('heading out') ||
    norm.includes('away mode') ||
    norm === 'leaving';

  if (isLeaving) {
    const routineResult = executeLeavingHomeRoutine(currentState);
    return {
      type: 'routine_direct',
      nextState: routineResult.nextState,
      logMessage: routineResult.logMessage,
      appliedUpdates: routineResult.appliedUpdates,
    };
  }

  // ==========================================
  // 4. ROUTINE: ENTERING HOME
  // ==========================================
  const isEntering =
    norm.includes('im home') ||
    norm.includes('i am home') ||
    norm.includes('entering home') ||
    norm.includes('arrived home') ||
    norm.includes('welcome home') ||
    norm.includes('just got home') ||
    norm.includes('back home') ||
    norm.includes('arriving home');

  if (isEntering) {
    const routineResult = executeEnteringHomeRoutine(currentState);
    return {
      type: 'routine_direct',
      nextState: routineResult.nextState,
      logMessage: routineResult.logMessage,
      appliedUpdates: routineResult.appliedUpdates,
    };
  }

  // ==========================================
  // 5. PROACTIVE AUTOMATION / PREFERENCE RULES
  // ==========================================
  if (
    norm.includes('when it rains') ||
    norm.includes('if it rains') ||
    norm.includes('when it storms') ||
    norm.includes('in winter') ||
    norm.includes('when it is cold') ||
    norm.includes('when it snows') ||
    norm.includes('in summer') ||
    norm.includes('when it is hot') ||
    norm.includes('when it is sunny') ||
    norm.includes('at night') ||
    norm.includes('when it gets dark') ||
    norm.includes('always close') ||
    norm.includes('always turn') ||
    norm.includes('set rule') ||
    norm.includes('automation rule')
  ) {
    let condition: 'sunny' | 'rainy' | 'winter' | 'night' = 'rainy';
    let conditionDesc = 'When it rains';
    const updates: Record<string, any> = {};

    if (norm.includes('rain') || norm.includes('storm')) {
      condition = 'rainy';
      conditionDesc = 'When it rains';
      updates.livingRoom = { mainDoorOpen: false };
      updates.kitchen = { windowOpen: false };
      updates.garage = { garageDoorOpen: false };
    } else if (norm.includes('winter') || norm.includes('cold') || norm.includes('snow')) {
      condition = 'winter';
      conditionDesc = 'Winter / Cold weather';
      updates.livingRoom = { acPower: false, fanPower: false };
      updates.bedroomMain = { acPower: false };
      updates.bedroom2 = { acPower: false, fanPower: false };
      updates.bedroom3 = { acPower: false };
      updates.diningRoom = { acPower: false };
    } else if (norm.includes('sun') || norm.includes('hot') || norm.includes('summer')) {
      condition = 'sunny';
      conditionDesc = 'Sunny / Hot weather';
      updates.livingRoom = { acPower: true, acTemp: 70, fanPower: true };
      updates.bedroomMain = { acPower: true, acTemp: 68 };
      updates.bedroom2 = { acPower: true, acTemp: 70 };
    } else if (norm.includes('night') || norm.includes('dark')) {
      condition = 'night';
      conditionDesc = 'Nighttime / Dark';
      updates.livingRoom = { mainDoorOpen: false, fanPower: false };
      updates.garage = { garageDoorOpen: false };
      updates.bedroomMain = { lightPower: false, lamp1Power: true, lamp1Intensity: 30 };
    }

    const pref: PreferenceRule = {
      id: `pref-${Date.now()}`,
      ruleText: rawText,
      condition,
      conditionDescription: conditionDesc,
      deviceUpdates: updates,
      summary: `Automate: ${conditionDesc} -> Secure & optimize matching devices`,
      createdAt: 'User Stated Rule',
      enabled: true,
    };

    return {
      type: 'preference',
      preference: pref,
      logMessage: `Created proactive automation rule for "${conditionDesc}": ${rawText}. Visible and triggerable in Preferences.`,
    };
  }

  // ==========================================
  // 6. BULK COMMANDS (All Lights, All Doors, All ACs, All Fans, All Windows)
  // ==========================================

  // BULK LIGHTS
  if (
    norm.includes('all lights') ||
    norm.includes('all the lights') ||
    norm.includes('every light') ||
    norm.includes('lights everywhere') ||
    norm === 'lights on' ||
    norm === 'lights off' ||
    norm === 'turn on lights' ||
    norm === 'turn off lights' ||
    norm.includes('dim all lights') ||
    norm.includes('brighten all lights') ||
    norm.includes('dim the lights') ||
    (norm.includes('lights') &&
      (norm.includes('dim') || norm.includes('brightness') || norm.includes('intensity') || norm.includes('set')) &&
      !norm.includes('living') &&
      !norm.includes('bed') &&
      !norm.includes('bath') &&
      !norm.includes('kitchen') &&
      !norm.includes('dining') &&
      !norm.includes('garage'))
  ) {
    const isOff = norm.includes('off') || norm.includes('shut') || norm.includes('kill');
    const params = extractLightParams(norm, 100);
    const turnOn = isOff ? false : params.power;

    const nextState: AllRoomsState = {
      ...currentState,
      livingRoom: {
        ...currentState.livingRoom,
        lightPower: turnOn,
        ...(params.isExplicitIntensity ? { lightIntensity: params.intensity } : {}),
      },
      kitchen: {
        ...currentState.kitchen,
        lightPower: turnOn,
        ...(params.isExplicitIntensity ? { lightIntensity: params.intensity } : {}),
      },
      diningRoom: {
        ...currentState.diningRoom,
        lightPower: turnOn,
        ...(params.isExplicitIntensity ? { lightIntensity: params.intensity } : {}),
      },
      bedroomMain: {
        ...currentState.bedroomMain,
        lightPower: turnOn,
        lamp1Power: turnOn,
        lamp2Power: turnOn,
        ...(params.isExplicitIntensity
          ? {
              lightIntensity: params.intensity,
              lamp1Intensity: params.intensity,
              lamp2Intensity: params.intensity,
            }
          : {}),
      },
      bedroom2: {
        ...currentState.bedroom2,
        lightPower: turnOn,
        lampPower: turnOn,
        ...(params.isExplicitIntensity
          ? {
              lightIntensity: params.intensity,
              lampIntensity: params.intensity,
            }
          : {}),
      },
      bedroom3: {
        ...currentState.bedroom3,
        lightPower: turnOn,
        lampPower: turnOn,
        ...(params.isExplicitIntensity
          ? {
              lightIntensity: params.intensity,
              lampIntensity: params.intensity,
            }
          : {}),
      },
      bathroomMain: {
        ...currentState.bathroomMain,
        lightPower: turnOn,
        ...(params.isExplicitIntensity ? { lightIntensity: params.intensity } : {}),
      },
      bathroom2: {
        ...currentState.bathroom2,
        lightPower: turnOn,
        ...(params.isExplicitIntensity ? { lightIntensity: params.intensity } : {}),
      },
      garage: {
        ...currentState.garage,
        lightPower: turnOn,
        ...(params.isExplicitIntensity ? { lightIntensity: params.intensity } : {}),
      },
    };

    const appliedUpdates = {
      allRooms: {
        lightPower: turnOn,
        ...(params.isExplicitIntensity ? { lightIntensity: params.intensity } : {}),
        lamps: turnOn,
      },
    };

    const logMessage = !turnOn
      ? 'Turned OFF all interior lights across all 9 zones.'
      : params.isExplicitIntensity
      ? `Set all interior lights to ${params.intensity}% brightness across all 9 zones.`
      : 'Turned ON all interior lights across all 9 zones.';

    return {
      type: 'command',
      nextState,
      logMessage,
      appliedUpdates,
    };
  }

  // BULK DOORS / EXTERIOR
  if (
    norm.includes('all doors') ||
    norm.includes('all the doors') ||
    norm.includes('exterior doors') ||
    norm.includes('lock up') ||
    norm.includes('lock the house') ||
    norm.includes('secure the house') ||
    norm.includes('close doors') ||
    norm.includes('lock doors')
  ) {
    const open = norm.includes('open') || norm.includes('unlock');

    const nextState: AllRoomsState = {
      ...currentState,
      livingRoom: { ...currentState.livingRoom, mainDoorOpen: open },
      garage: { ...currentState.garage, garageDoorOpen: open },
    };

    return {
      type: 'command',
      nextState,
      logMessage: open
        ? 'Unlocked and opened all exterior doors and garage bay.'
        : 'Locked and secured all exterior doors and garage bay.',
      appliedUpdates: {
        livingRoom: { mainDoorOpen: open },
        garage: { garageDoorOpen: open },
      },
    };
  }

  // BULK AC / CLIMATE
  if (
    norm.includes('all ac') ||
    norm.includes('all acs') ||
    norm.includes('all air conditioners') ||
    norm.includes('all climate') ||
    norm.includes('all hvac') ||
    norm === 'turn off ac' ||
    norm === 'turn off all ac' ||
    norm === 'turn on ac' ||
    norm === 'ac off' ||
    norm === 'ac on'
  ) {
    const isOff = norm.includes('off') || norm.includes('shut');
    const turnOn = !isOff;

    const tempMatch = norm.match(/(\d{2})/);
    const targetTemp = tempMatch ? Math.min(85, Math.max(60, parseInt(tempMatch[1], 10))) : 72;

    const nextState: AllRoomsState = {
      ...currentState,
      livingRoom: {
        ...currentState.livingRoom,
        acPower: turnOn,
        ...(tempMatch ? { acTemp: targetTemp } : {}),
      },
      bedroomMain: {
        ...currentState.bedroomMain,
        acPower: turnOn,
        ...(tempMatch ? { acTemp: targetTemp } : {}),
      },
      bedroom2: {
        ...currentState.bedroom2,
        acPower: turnOn,
        ...(tempMatch ? { acTemp: targetTemp } : {}),
      },
      bedroom3: {
        ...currentState.bedroom3,
        acPower: turnOn,
        ...(tempMatch ? { acTemp: targetTemp } : {}),
      },
      diningRoom: {
        ...currentState.diningRoom,
        acPower: turnOn,
        ...(tempMatch ? { acTemp: targetTemp } : {}),
      },
    };

    return {
      type: 'command',
      nextState,
      logMessage: tempMatch
        ? `Set AC to ${targetTemp}°F across all home climate zones.`
        : `Turned ${turnOn ? 'ON' : 'OFF'} AC across all 5 climate zones.`,
      appliedUpdates: {
        climateZones: { acPower: turnOn, ...(tempMatch ? { acTemp: targetTemp } : {}) },
      },
    };
  }

  // BULK FANS
  if (
    norm.includes('all fans') ||
    norm.includes('all the fans') ||
    norm === 'fans on' ||
    norm === 'fans off' ||
    norm === 'turn off fans' ||
    norm === 'turn on fans' ||
    (norm.includes('fans') &&
      (norm.includes('speed') || norm.includes('set') || norm.includes('mode')) &&
      !norm.includes('living') &&
      !norm.includes('bed') &&
      !norm.includes('bath'))
  ) {
    const isOff = norm.includes('off') || norm.includes('stop');
    const fanParams = extractFanParams(norm, 60, 'med');
    const turnOn = isOff ? false : fanParams.power;
    const targetSpeed = isOff ? 0 : fanParams.speed;
    const targetMode = isOff ? 'off' : fanParams.mode;

    const nextState: AllRoomsState = {
      ...currentState,
      livingRoom: {
        ...currentState.livingRoom,
        fanPower: turnOn,
        fanMode: targetMode,
        fanSpeed: targetSpeed,
      },
      bedroom2: {
        ...currentState.bedroom2,
        fanPower: turnOn,
        fanMode: targetMode,
        fanSpeed: targetSpeed,
      },
      bathroomMain: {
        ...currentState.bathroomMain,
        exhaustFanPower: turnOn,
        exhaustFanSpeed: targetSpeed,
        exhaustFanMode: targetMode,
      },
      bathroom2: {
        ...currentState.bathroom2,
        exhaustFanPower: turnOn,
        exhaustFanSpeed: targetSpeed,
        exhaustFanMode: targetMode,
      },
    };

    const logMessage = !turnOn
      ? 'Turned OFF all ceiling and exhaust fans.'
      : `Set all home fans to ${targetMode.toUpperCase()} (${targetSpeed}%).`;

    return {
      type: 'command',
      nextState,
      logMessage,
      appliedUpdates: {
        allFans: { power: turnOn, speed: targetSpeed, mode: targetMode },
      },
    };
  }

  // BULK WINDOWS
  if (norm.includes('all windows') || norm.includes('all the windows') || norm.includes('windows')) {
    const open = norm.includes('open') && !norm.includes('close') && !norm.includes('shut');
    const nextState: AllRoomsState = {
      ...currentState,
      kitchen: { ...currentState.kitchen, windowOpen: open },
    };
    return {
      type: 'command',
      nextState,
      logMessage: open ? 'Opened the kitchen window.' : 'Closed and sealed the kitchen window.',
      appliedUpdates: { kitchen: { windowOpen: open } },
    };
  }

  // ==========================================
  // 7. SPECIFIC ROOM + DEVICE COMBINATIONS
  // ==========================================

  // --- KITCHEN CHIMNEY / HOOD ---
  if (norm.includes('chimney') || norm.includes('range hood') || norm.includes('vent hood') || (norm.includes('kitchen') && norm.includes('hood'))) {
    const isOff = norm.includes('off') || norm.includes('stop');
    const turnOn = !isOff;

    let speed: 'low' | 'med' | 'high' | 'turbo' = currentState.kitchen.chimneySpeed || 'med';
    if (norm.includes('turbo') || norm.includes('max')) speed = 'turbo';
    else if (norm.includes('high')) speed = 'high';
    else if (norm.includes('low')) speed = 'low';
    else if (norm.includes('med') || norm.includes('medium')) speed = 'med';

    const nextState: AllRoomsState = {
      ...currentState,
      kitchen: {
        ...currentState.kitchen,
        chimneyPower: turnOn,
        chimneySpeed: speed,
      },
    };

    return {
      type: 'command',
      nextState,
      logMessage: turnOn
        ? `Turned ON Kitchen Chimney (${speed.toUpperCase()} speed).`
        : 'Turned OFF Kitchen Chimney.',
      appliedUpdates: { kitchen: { chimneyPower: turnOn, chimneySpeed: speed } },
    };
  }

  // --- GARAGE DOOR ---
  if (norm.includes('garage door') || (norm.includes('garage') && (norm.includes('door') || norm.includes('open') || norm.includes('close') || norm.includes('shut')))) {
    const open = norm.includes('open') && !norm.includes('close') && !norm.includes('shut');
    const nextState: AllRoomsState = {
      ...currentState,
      garage: { ...currentState.garage, garageDoorOpen: open },
    };

    return {
      type: 'command',
      nextState,
      logMessage: open ? 'Opened Garage door.' : 'Closed and secured Garage door.',
      appliedUpdates: { garage: { garageDoorOpen: open } },
    };
  }

  // --- MAIN / FRONT DOOR ---
  if (
    norm.includes('front door') ||
    norm.includes('main door') ||
    norm.includes('entrance door') ||
    (norm.includes('door') && !norm.includes('garage'))
  ) {
    const open = (norm.includes('open') || norm.includes('unlock')) && !norm.includes('close') && !norm.includes('lock') && !norm.includes('shut');
    const nextState: AllRoomsState = {
      ...currentState,
      livingRoom: { ...currentState.livingRoom, mainDoorOpen: open },
    };

    return {
      type: 'command',
      nextState,
      logMessage: open ? 'Unlocked and opened the main front door.' : 'Locked and closed the main front door.',
      appliedUpdates: { livingRoom: { mainDoorOpen: open } },
    };
  }

  // --- LIVING ROOM FAN ---
  if (
    (norm.includes('living') && norm.includes('fan')) ||
    (norm.includes('ceiling fan') && !norm.includes('bed') && !norm.includes('guest'))
  ) {
    const isOff = norm.includes('off') || norm.includes('stop');
    const params = extractFanParams(
      norm,
      currentState.livingRoom.fanSpeed || 60,
      currentState.livingRoom.fanMode || 'med'
    );
    const turnOn = isOff ? false : params.power;
    const speed = isOff ? 0 : params.speed;
    const mode = isOff ? 'off' : params.mode;

    const nextState: AllRoomsState = {
      ...currentState,
      livingRoom: {
        ...currentState.livingRoom,
        fanPower: turnOn,
        fanMode: mode,
        fanSpeed: speed,
      },
    };

    return {
      type: 'command',
      nextState,
      logMessage: turnOn
        ? `Living Room fan set to ${mode.toUpperCase()} (${speed}%).`
        : 'Turned OFF Living Room ceiling fan.',
      appliedUpdates: { livingRoom: { fanPower: turnOn, fanMode: mode, fanSpeed: speed } },
    };
  }

  // --- BEDROOM 2 FAN ---
  if (
    (norm.includes('bedroom 2') && norm.includes('fan')) ||
    (norm.includes('bed 2') && norm.includes('fan')) ||
    (norm.includes('guest') && norm.includes('fan'))
  ) {
    const isOff = norm.includes('off') || norm.includes('stop');
    const params = extractFanParams(
      norm,
      currentState.bedroom2.fanSpeed || 60,
      currentState.bedroom2.fanMode || 'med'
    );
    const turnOn = isOff ? false : params.power;
    const speed = isOff ? 0 : params.speed;
    const mode = isOff ? 'off' : params.mode;

    const nextState: AllRoomsState = {
      ...currentState,
      bedroom2: {
        ...currentState.bedroom2,
        fanPower: turnOn,
        fanMode: mode,
        fanSpeed: speed,
      },
    };

    return {
      type: 'command',
      nextState,
      logMessage: turnOn
        ? `Bedroom 2 fan set to ${mode.toUpperCase()} (${speed}%).`
        : 'Turned OFF Bedroom 2 fan.',
      appliedUpdates: { bedroom2: { fanPower: turnOn, fanMode: mode, fanSpeed: speed } },
    };
  }

  // --- BATHROOM EXHAUST FANS ---
  if (norm.includes('exhaust') || (norm.includes('bathroom') && norm.includes('fan')) || (norm.includes('bath') && norm.includes('fan'))) {
    const isOff = norm.includes('off') || norm.includes('stop');
    const params = extractFanParams(
      norm,
      currentState.bathroomMain.exhaustFanSpeed || 60,
      currentState.bathroomMain.exhaustFanMode || 'med'
    );
    const turnOn = isOff ? false : params.power;
    const speed = isOff ? 0 : params.speed;
    const mode = isOff ? 'off' : params.mode;

    const isBath2 = norm.includes('guest') || norm.includes('bath 2') || norm.includes('bathroom 2') || norm.includes('second bath');
    const isBath1 = norm.includes('main') || norm.includes('master') || norm.includes('bath 1') || norm.includes('bathroom 1');

    const nextState: AllRoomsState = {
      ...currentState,
      ...(isBath2 || !isBath1 ? { bathroom2: { ...currentState.bathroom2, exhaustFanPower: turnOn, exhaustFanSpeed: speed, exhaustFanMode: mode } } : {}),
      ...(isBath1 || !isBath2 ? { bathroomMain: { ...currentState.bathroomMain, exhaustFanPower: turnOn, exhaustFanSpeed: speed, exhaustFanMode: mode } } : {}),
    };

    return {
      type: 'command',
      nextState,
      logMessage: turnOn
        ? `Bathroom exhaust fan set to ${mode.toUpperCase()} (${speed}%).`
        : 'Turned OFF bathroom exhaust fan(s).',
      appliedUpdates: {
        ...(isBath1 || !isBath2 ? { bathroomMain: { exhaustFanPower: turnOn, exhaustFanSpeed: speed, exhaustFanMode: mode } } : {}),
        ...(isBath2 || !isBath1 ? { bathroom2: { exhaustFanPower: turnOn, exhaustFanSpeed: speed, exhaustFanMode: mode } } : {}),
      },
    };
  }

  // --- INDIVIDUAL ROOM CLIMATE / AC ---
  if (norm.includes('ac') || norm.includes('climate') || norm.includes('air conditioning') || norm.includes('temperature') || norm.includes('temp')) {
    const isOff = norm.includes('off') || norm.includes('stop');
    const turnOn = !isOff;
    const tempMatch = norm.match(/(\d{2})/);
    const targetTemp = tempMatch ? Math.min(85, Math.max(60, parseInt(tempMatch[1], 10))) : null;

    if (norm.includes('living')) {
      const nextState: AllRoomsState = {
        ...currentState,
        livingRoom: {
          ...currentState.livingRoom,
          acPower: turnOn,
          ...(targetTemp ? { acTemp: targetTemp } : {}),
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: targetTemp
          ? `Set Living Room AC to ${targetTemp}°F.`
          : `Turned ${turnOn ? 'ON' : 'OFF'} Living Room AC.`,
        appliedUpdates: { livingRoom: { acPower: turnOn, ...(targetTemp ? { acTemp: targetTemp } : {}) } },
      };
    }

    if (norm.includes('master') || norm.includes('bedroom 1') || norm.includes('main bed')) {
      const nextState: AllRoomsState = {
        ...currentState,
        bedroomMain: {
          ...currentState.bedroomMain,
          acPower: turnOn,
          ...(targetTemp ? { acTemp: targetTemp } : {}),
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: targetTemp
          ? `Set Master Suite AC to ${targetTemp}°F.`
          : `Turned ${turnOn ? 'ON' : 'OFF'} Master Suite AC.`,
        appliedUpdates: { bedroomMain: { acPower: turnOn, ...(targetTemp ? { acTemp: targetTemp } : {}) } },
      };
    }

    if (norm.includes('bedroom 2') || norm.includes('guest bed')) {
      const nextState: AllRoomsState = {
        ...currentState,
        bedroom2: {
          ...currentState.bedroom2,
          acPower: turnOn,
          ...(targetTemp ? { acTemp: targetTemp } : {}),
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: targetTemp
          ? `Set Bedroom 2 AC to ${targetTemp}°F.`
          : `Turned ${turnOn ? 'ON' : 'OFF'} Bedroom 2 AC.`,
        appliedUpdates: { bedroom2: { acPower: turnOn, ...(targetTemp ? { acTemp: targetTemp } : {}) } },
      };
    }

    if (norm.includes('bedroom 3') || norm.includes('studio') || norm.includes('office')) {
      const nextState: AllRoomsState = {
        ...currentState,
        bedroom3: {
          ...currentState.bedroom3,
          acPower: turnOn,
          ...(targetTemp ? { acTemp: targetTemp } : {}),
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: targetTemp
          ? `Set Studio / Bed 3 AC to ${targetTemp}°F.`
          : `Turned ${turnOn ? 'ON' : 'OFF'} Studio AC.`,
        appliedUpdates: { bedroom3: { acPower: turnOn, ...(targetTemp ? { acTemp: targetTemp } : {}) } },
      };
    }

    if (norm.includes('dining')) {
      const nextState: AllRoomsState = {
        ...currentState,
        diningRoom: {
          ...currentState.diningRoom,
          acPower: turnOn,
          ...(targetTemp ? { acTemp: targetTemp } : {}),
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: targetTemp
          ? `Set Dining Room AC to ${targetTemp}°F.`
          : `Turned ${turnOn ? 'ON' : 'OFF'} Dining Room AC.`,
        appliedUpdates: { diningRoom: { acPower: turnOn, ...(targetTemp ? { acTemp: targetTemp } : {}) } },
      };
    }

    // Generic "set AC to 68" -> apply to livingRoom & master bedroom
    if (targetTemp) {
      const nextState: AllRoomsState = {
        ...currentState,
        livingRoom: { ...currentState.livingRoom, acPower: true, acTemp: targetTemp },
        bedroomMain: { ...currentState.bedroomMain, acPower: true, acTemp: targetTemp },
      };
      return {
        type: 'command',
        nextState,
        logMessage: `Set primary climate zones to ${targetTemp}°F.`,
        appliedUpdates: {
          livingRoom: { acPower: true, acTemp: targetTemp },
          bedroomMain: { acPower: true, acTemp: targetTemp },
        },
      };
    }
  }

  // --- MASTER BEDROOM LAMPS ---
  if (norm.includes('master') && (norm.includes('lamp') || norm.includes('nightstand'))) {
    const isOff = norm.includes('off') || norm.includes('kill');
    const isLamp1 = norm.includes('1') || norm.includes('left') || norm.includes('one');
    const isLamp2 = norm.includes('2') || norm.includes('right') || norm.includes('two');
    const currentIntensity = isLamp2
      ? currentState.bedroomMain.lamp2Intensity ?? 100
      : currentState.bedroomMain.lamp1Intensity ?? 100;
    const params = extractLightParams(norm, currentIntensity);
    const turnOn = isOff ? false : params.power;
    const targetIntensity = params.isExplicitIntensity ? params.intensity : currentIntensity;

    const nextState: AllRoomsState = {
      ...currentState,
      bedroomMain: {
        ...currentState.bedroomMain,
        ...(isLamp1 || !isLamp2
          ? {
              lamp1Power: turnOn,
              lamp1Intensity: targetIntensity,
            }
          : {}),
        ...(isLamp2 || !isLamp1
          ? {
              lamp2Power: turnOn,
              lamp2Intensity: targetIntensity,
            }
          : {}),
      },
    };

    return {
      type: 'command',
      nextState,
      logMessage: !turnOn
        ? 'Turned OFF Master Suite lamp(s).'
        : params.isExplicitIntensity
        ? `Set Master Suite lamp(s) intensity to ${targetIntensity}%.`
        : `Turned ON Master Suite lamp(s) (${targetIntensity}%).`,
      appliedUpdates: {
        bedroomMain: {
          ...(isLamp1 || !isLamp2
            ? { lamp1Power: turnOn, lamp1Intensity: targetIntensity }
            : {}),
          ...(isLamp2 || !isLamp1
            ? { lamp2Power: turnOn, lamp2Intensity: targetIntensity }
            : {}),
        },
      },
    };
  }

  // --- SPECIFIC ROOM LIGHTS ---
  if (
    norm.includes('light') ||
    norm.includes('lights') ||
    norm.includes('lamp') ||
    norm.includes('chandelier') ||
    norm.includes('dim') ||
    norm.includes('brighten') ||
    norm.includes('brightness') ||
    norm.includes('intensity') ||
    norm.includes('illumination')
  ) {
    if (norm.includes('living')) {
      const currentIntensity = currentState.livingRoom.lightIntensity ?? 100;
      const params = extractLightParams(norm, currentIntensity);
      const isOff = norm.includes('off') || norm.includes('kill');
      const turnOn = isOff ? false : params.power;
      const targetIntensity = params.isExplicitIntensity ? params.intensity : currentIntensity;

      const nextState: AllRoomsState = {
        ...currentState,
        livingRoom: {
          ...currentState.livingRoom,
          lightPower: turnOn,
          lightIntensity: targetIntensity,
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: !turnOn
          ? 'Turned OFF Living Room lights.'
          : params.isExplicitIntensity
          ? `Set Living Room light intensity to ${targetIntensity}%.`
          : `Turned ON Living Room lights (${targetIntensity}%).`,
        appliedUpdates: {
          livingRoom: { lightPower: turnOn, lightIntensity: targetIntensity },
        },
      };
    }

    if (norm.includes('kitchen')) {
      const currentIntensity = currentState.kitchen.lightIntensity ?? 100;
      const params = extractLightParams(norm, currentIntensity);
      const isOff = norm.includes('off') || norm.includes('kill');
      const turnOn = isOff ? false : params.power;
      const targetIntensity = params.isExplicitIntensity ? params.intensity : currentIntensity;

      const nextState: AllRoomsState = {
        ...currentState,
        kitchen: {
          ...currentState.kitchen,
          lightPower: turnOn,
          lightIntensity: targetIntensity,
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: !turnOn
          ? 'Turned OFF Kitchen lights.'
          : params.isExplicitIntensity
          ? `Set Kitchen light intensity to ${targetIntensity}%.`
          : `Turned ON Kitchen lights (${targetIntensity}%).`,
        appliedUpdates: {
          kitchen: { lightPower: turnOn, lightIntensity: targetIntensity },
        },
      };
    }

    if (norm.includes('dining') || norm.includes('chandelier')) {
      const currentIntensity = currentState.diningRoom.lightIntensity ?? 100;
      const params = extractLightParams(norm, currentIntensity);
      const isOff = norm.includes('off') || norm.includes('kill');
      const turnOn = isOff ? false : params.power;
      const targetIntensity = params.isExplicitIntensity ? params.intensity : currentIntensity;

      const nextState: AllRoomsState = {
        ...currentState,
        diningRoom: {
          ...currentState.diningRoom,
          lightPower: turnOn,
          lightIntensity: targetIntensity,
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: !turnOn
          ? 'Turned OFF Dining Room chandelier light.'
          : params.isExplicitIntensity
          ? `Set Dining Room chandelier intensity to ${targetIntensity}%.`
          : `Turned ON Dining Room chandelier (${targetIntensity}%).`,
        appliedUpdates: {
          diningRoom: { lightPower: turnOn, lightIntensity: targetIntensity },
        },
      };
    }

    if (norm.includes('master') || norm.includes('main bed') || norm.includes('bedroom 1')) {
      const currentIntensity = currentState.bedroomMain.lightIntensity ?? 100;
      const params = extractLightParams(norm, currentIntensity);
      const isOff = norm.includes('off') || norm.includes('kill');
      const turnOn = isOff ? false : params.power;
      const targetIntensity = params.isExplicitIntensity ? params.intensity : currentIntensity;

      const nextState: AllRoomsState = {
        ...currentState,
        bedroomMain: {
          ...currentState.bedroomMain,
          lightPower: turnOn,
          lightIntensity: targetIntensity,
          lamp1Power: turnOn,
          lamp1Intensity: targetIntensity,
          lamp2Power: turnOn,
          lamp2Intensity: targetIntensity,
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: !turnOn
          ? 'Turned OFF Master Suite lights and lamps.'
          : params.isExplicitIntensity
          ? `Set Master Suite lights and lamps to ${targetIntensity}%.`
          : `Turned ON Master Suite lights and lamps (${targetIntensity}%).`,
        appliedUpdates: {
          bedroomMain: {
            lightPower: turnOn,
            lightIntensity: targetIntensity,
            lamp1Power: turnOn,
            lamp1Intensity: targetIntensity,
            lamp2Power: turnOn,
            lamp2Intensity: targetIntensity,
          },
        },
      };
    }

    if (norm.includes('bedroom 2') || norm.includes('guest bed')) {
      const currentIntensity = currentState.bedroom2.lightIntensity ?? 100;
      const params = extractLightParams(norm, currentIntensity);
      const isOff = norm.includes('off') || norm.includes('kill');
      const turnOn = isOff ? false : params.power;
      const targetIntensity = params.isExplicitIntensity ? params.intensity : currentIntensity;

      const nextState: AllRoomsState = {
        ...currentState,
        bedroom2: {
          ...currentState.bedroom2,
          lightPower: turnOn,
          lightIntensity: targetIntensity,
          lampPower: turnOn,
          lampIntensity: targetIntensity,
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: !turnOn
          ? 'Turned OFF Bedroom 2 lights.'
          : params.isExplicitIntensity
          ? `Set Bedroom 2 lights to ${targetIntensity}%.`
          : `Turned ON Bedroom 2 lights (${targetIntensity}%).`,
        appliedUpdates: {
          bedroom2: {
            lightPower: turnOn,
            lightIntensity: targetIntensity,
            lampPower: turnOn,
            lampIntensity: targetIntensity,
          },
        },
      };
    }

    if (norm.includes('bedroom 3') || norm.includes('studio') || norm.includes('office')) {
      const currentIntensity = currentState.bedroom3.lightIntensity ?? 100;
      const params = extractLightParams(norm, currentIntensity);
      const isOff = norm.includes('off') || norm.includes('kill');
      const turnOn = isOff ? false : params.power;
      const targetIntensity = params.isExplicitIntensity ? params.intensity : currentIntensity;

      const nextState: AllRoomsState = {
        ...currentState,
        bedroom3: {
          ...currentState.bedroom3,
          lightPower: turnOn,
          lightIntensity: targetIntensity,
          lampPower: turnOn,
          lampIntensity: targetIntensity,
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: !turnOn
          ? 'Turned OFF Studio / Bed 3 lights.'
          : params.isExplicitIntensity
          ? `Set Studio / Bed 3 lights to ${targetIntensity}%.`
          : `Turned ON Studio / Bed 3 lights (${targetIntensity}%).`,
        appliedUpdates: {
          bedroom3: {
            lightPower: turnOn,
            lightIntensity: targetIntensity,
            lampPower: turnOn,
            lampIntensity: targetIntensity,
          },
        },
      };
    }

    if (norm.includes('bathroom') || norm.includes('bath')) {
      const isBath2 = norm.includes('guest') || norm.includes('bath 2') || norm.includes('bathroom 2');
      const isBath1 = norm.includes('main') || norm.includes('master') || norm.includes('bath 1') || norm.includes('bathroom 1');
      const currentIntensity = isBath2
        ? currentState.bathroom2.lightIntensity ?? 100
        : currentState.bathroomMain.lightIntensity ?? 100;
      const params = extractLightParams(norm, currentIntensity);
      const isOff = norm.includes('off') || norm.includes('kill');
      const turnOn = isOff ? false : params.power;
      const targetIntensity = params.isExplicitIntensity ? params.intensity : currentIntensity;

      const nextState: AllRoomsState = {
        ...currentState,
        ...(isBath2 || !isBath1
          ? {
              bathroom2: {
                ...currentState.bathroom2,
                lightPower: turnOn,
                lightIntensity: targetIntensity,
              },
            }
          : {}),
        ...(isBath1 || !isBath2
          ? {
              bathroomMain: {
                ...currentState.bathroomMain,
                lightPower: turnOn,
                lightIntensity: targetIntensity,
              },
            }
          : {}),
      };

      return {
        type: 'command',
        nextState,
        logMessage: !turnOn
          ? 'Turned OFF bathroom light(s).'
          : params.isExplicitIntensity
          ? `Set bathroom light intensity to ${targetIntensity}%.`
          : `Turned ON bathroom light(s) (${targetIntensity}%).`,
        appliedUpdates: {
          ...(isBath1 || !isBath2
            ? { bathroomMain: { lightPower: turnOn, lightIntensity: targetIntensity } }
            : {}),
          ...(isBath2 || !isBath1
            ? { bathroom2: { lightPower: turnOn, lightIntensity: targetIntensity } }
            : {}),
        },
      };
    }

    if (norm.includes('garage')) {
      const currentIntensity = currentState.garage.lightIntensity ?? 100;
      const params = extractLightParams(norm, currentIntensity);
      const isOff = norm.includes('off') || norm.includes('kill');
      const turnOn = isOff ? false : params.power;
      const targetIntensity = params.isExplicitIntensity ? params.intensity : currentIntensity;

      const nextState: AllRoomsState = {
        ...currentState,
        garage: {
          ...currentState.garage,
          lightPower: turnOn,
          lightIntensity: targetIntensity,
        },
      };
      return {
        type: 'command',
        nextState,
        logMessage: !turnOn
          ? 'Turned OFF Garage light.'
          : params.isExplicitIntensity
          ? `Set Garage light intensity to ${targetIntensity}%.`
          : `Turned ON Garage light (${targetIntensity}%).`,
        appliedUpdates: {
          garage: { lightPower: turnOn, lightIntensity: targetIntensity },
        },
      };
    }
  }

  // Not matched as a deterministic command -> fallback to Gemini for open conversation
  return { type: 'unmatched' };
}
