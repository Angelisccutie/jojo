/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AllRoomsState, RoutineId, RoutineOption } from '../types';

export const GOODNIGHT_ROOM_OPTIONS: RoutineOption[] = [
  {
    id: 'livingRoom',
    label: 'Living Room',
    roomKey: 'livingRoom',
    description: 'Sofa lounge & climate zone',
  },
  {
    id: 'bedroomMain',
    label: 'Master Suite',
    roomKey: 'bedroomMain',
    description: 'Primary bedroom & dual lamps',
  },
  {
    id: 'bedroom2',
    label: 'Bedroom 2',
    roomKey: 'bedroom2',
    description: 'Guest bedroom & ceiling fan',
  },
  {
    id: 'bedroom3',
    label: 'Studio / Bed 3',
    roomKey: 'bedroom3',
    description: 'Studio workspace & bed',
  },
];

export const BATH_ROOM_OPTIONS: RoutineOption[] = [
  {
    id: 'bathroomMain',
    label: 'Main Bathroom',
    roomKey: 'bathroomMain',
    description: 'Primary en-suite bathroom',
  },
  {
    id: 'bathroom2',
    label: 'Guest Bath 2',
    roomKey: 'bathroom2',
    description: 'Secondary guest powder room',
  },
];

export interface RoutineExecutionResult {
  nextState: AllRoomsState;
  logMessage: string;
  appliedUpdates: Record<string, any>;
}

/**
 * Execute Goodnight Routine
 * Sets selected room AC to eco mode (74°F / ON) and powers down all other electronic devices
 */
export function executeGoodnightRoutine(
  prevState: AllRoomsState,
  roomKey: keyof AllRoomsState,
  roomLabel?: string
): RoutineExecutionResult {
  const label =
    roomLabel ||
    GOODNIGHT_ROOM_OPTIONS.find((opt) => opt.roomKey === roomKey)?.label ||
    (roomKey === 'bedroomMain' ? 'Master Suite' : roomKey === 'livingRoom' ? 'Living Room' : roomKey === 'bedroom2' ? 'Bedroom 2' : 'Studio / Bed 3');

  const nextState: AllRoomsState = {
    livingRoom: {
      ...prevState.livingRoom,
      lightPower: false,
      fanPower: false,
      fanMode: 'off',
      acPower: roomKey === 'livingRoom',
      acTemp: roomKey === 'livingRoom' ? 74 : prevState.livingRoom.acTemp,
    },
    bedroomMain: {
      ...prevState.bedroomMain,
      lightPower: false,
      lamp1Power: false,
      lamp2Power: false,
      acPower: roomKey === 'bedroomMain',
      acTemp: roomKey === 'bedroomMain' ? 74 : prevState.bedroomMain.acTemp,
    },
    bedroom2: {
      ...prevState.bedroom2,
      lightPower: false,
      lampPower: false,
      fanPower: false,
      fanMode: 'off',
      acPower: roomKey === 'bedroom2',
      acTemp: roomKey === 'bedroom2' ? 74 : prevState.bedroom2.acTemp,
    },
    bedroom3: {
      ...prevState.bedroom3,
      lightPower: false,
      lampPower: false,
      acPower: roomKey === 'bedroom3',
      acTemp: roomKey === 'bedroom3' ? 74 : prevState.bedroom3.acTemp,
    },
    diningRoom: {
      ...prevState.diningRoom,
      lightPower: false,
      acPower: false,
    },
    kitchen: {
      ...prevState.kitchen,
      lightPower: false,
      chimneyPower: false,
    },
    bathroomMain: {
      ...prevState.bathroomMain,
      lightPower: false,
      exhaustFanPower: false,
    },
    bathroom2: {
      ...prevState.bathroom2,
      lightPower: false,
      exhaustFanPower: false,
    },
    garage: {
      ...prevState.garage,
      lightPower: false,
    },
  };

  const logMessage = `Goodnight routine: ${label} AC set to eco, all other devices powered down.`;

  return {
    nextState,
    logMessage,
    appliedUpdates: {
      [roomKey]: { acPower: true, acTemp: 74 },
      allOtherZones: { power: 'off' },
    },
  };
}

/**
 * Execute Bath Time Routine
 * Turns ON the selected bathroom light and turns OFF all other electronic devices in the house
 */
export function executeBathRoutine(
  prevState: AllRoomsState,
  roomKey: keyof AllRoomsState,
  roomLabel?: string
): RoutineExecutionResult {
  const label =
    roomLabel ||
    BATH_ROOM_OPTIONS.find((opt) => opt.roomKey === roomKey)?.label ||
    (roomKey === 'bathroomMain' ? 'Main Bathroom' : 'Guest Bath 2');

  const nextState: AllRoomsState = {
    livingRoom: {
      ...prevState.livingRoom,
      lightPower: false,
      fanPower: false,
      fanMode: 'off',
      acPower: false,
    },
    bedroomMain: {
      ...prevState.bedroomMain,
      lightPower: false,
      lamp1Power: false,
      lamp2Power: false,
      acPower: false,
    },
    bedroom2: {
      ...prevState.bedroom2,
      lightPower: false,
      lampPower: false,
      fanPower: false,
      fanMode: 'off',
      acPower: false,
    },
    bedroom3: {
      ...prevState.bedroom3,
      lightPower: false,
      lampPower: false,
      acPower: false,
    },
    diningRoom: {
      ...prevState.diningRoom,
      lightPower: false,
      acPower: false,
    },
    kitchen: {
      ...prevState.kitchen,
      lightPower: false,
      chimneyPower: false,
    },
    bathroomMain: {
      ...prevState.bathroomMain,
      lightPower: roomKey === 'bathroomMain',
      exhaustFanPower: false,
    },
    bathroom2: {
      ...prevState.bathroom2,
      lightPower: roomKey === 'bathroom2',
      exhaustFanPower: false,
    },
    garage: {
      ...prevState.garage,
      lightPower: false,
    },
  };

  const logMessage = `Bath routine: ${label} light on, all other devices powered down.`;

  return {
    nextState,
    logMessage,
    appliedUpdates: {
      [roomKey]: { lightPower: true },
      allOtherZones: { power: 'off' },
    },
  };
}

/**
 * Execute Leaving Home Routine
 * Turns OFF every device in every room across the entire house, closes & locks all doors and garage
 */
export function executeLeavingHomeRoutine(prevState: AllRoomsState): RoutineExecutionResult {
  const nextState: AllRoomsState = {
    livingRoom: {
      ...prevState.livingRoom,
      lightPower: false,
      mainDoorOpen: false,
      fanPower: false,
      fanMode: 'off',
      fanSpeed: 0,
      acPower: false,
    },
    bedroomMain: {
      ...prevState.bedroomMain,
      lightPower: false,
      lamp1Power: false,
      lamp2Power: false,
      acPower: false,
    },
    bedroom2: {
      ...prevState.bedroom2,
      lightPower: false,
      lampPower: false,
      fanPower: false,
      fanMode: 'off',
      fanSpeed: 0,
      acPower: false,
    },
    bedroom3: {
      ...prevState.bedroom3,
      lightPower: false,
      lampPower: false,
      acPower: false,
    },
    diningRoom: {
      ...prevState.diningRoom,
      lightPower: false,
      acPower: false,
    },
    kitchen: {
      ...prevState.kitchen,
      lightPower: false,
      chimneyPower: false,
      windowOpen: false,
    },
    bathroomMain: {
      ...prevState.bathroomMain,
      lightPower: false,
      exhaustFanPower: false,
    },
    bathroom2: {
      ...prevState.bathroom2,
      lightPower: false,
      exhaustFanPower: false,
    },
    garage: {
      ...prevState.garage,
      garageDoorOpen: false,
      lightPower: false,
    },
  };

  const logMessage = 'Leaving Home routine: entire house powered down and secured.';

  return {
    nextState,
    logMessage,
    appliedUpdates: {
      allZones: { power: 'off', doors: 'closed' },
    },
  };
}

/**
 * Execute Entering Home Routine
 * Turns ON Living Room AC, ceiling fan at LOW speed, and lights. Leaves everything else unchanged.
 */
export function executeEnteringHomeRoutine(prevState: AllRoomsState): RoutineExecutionResult {
  const nextState: AllRoomsState = {
    ...prevState,
    livingRoom: {
      ...prevState.livingRoom,
      acPower: true,
      fanPower: true,
      fanMode: 'low',
      fanSpeed: 25,
      lightPower: true,
    },
  };

  const logMessage = 'Entering Home routine: Living Room AC, fan (low), and lights activated.';

  return {
    nextState,
    logMessage,
    appliedUpdates: {
      livingRoom: {
        acPower: true,
        fanPower: true,
        fanMode: 'low',
        fanSpeed: 25,
        lightPower: true,
      },
    },
  };
}
