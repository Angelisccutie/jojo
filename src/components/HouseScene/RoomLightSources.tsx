/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { AllRoomsState } from '../../types';

export interface RoomLightConfig {
  id: string;
  name: string;
  roomKey: keyof AllRoomsState;
  position: [number, number, number];
  hitboxPosition: [number, number, number];
  hitboxSize: [number, number, number];
  color: string;
  maxIntensity: number;
  distance: number;
  decay: number;
  isOn: (state: AllRoomsState) => boolean;
  getIntensityRatio: (state: AllRoomsState) => number;
}

// Calibrated light positions and exact room footprints matching each dedicated room's 3D coordinates
export const ROOM_LIGHT_CONFIGS: RoomLightConfig[] = [
  // 1. Living Room (Center-South)
  {
    id: 'livingRoom',
    name: 'Living Room',
    roomKey: 'livingRoom',
    position: [-0.5, 2.4, 2.0],
    hitboxPosition: [-0.52, 1.0, 2.08],
    hitboxSize: [3.4, 2.0, 7.3],
    color: '#ffe6aa', // Warm living room ambient glow
    maxIntensity: 38.0,
    distance: 7.8,
    decay: 1.8,
    isOn: (state) => !!state.livingRoom.lightPower,
    getIntensityRatio: (state) =>
      state.livingRoom.lightPower
        ? Math.max(0, Math.min(100, state.livingRoom.lightIntensity ?? 100)) / 100
        : 0,
  },
  // 2. Dining Room (East-Mid-South)
  {
    id: 'diningRoom',
    name: 'Dining Room',
    roomKey: 'diningRoom',
    position: [2.8, 2.4, 2.6],
    hitboxPosition: [2.66, 1.0, 2.78],
    hitboxSize: [2.5, 2.0, 5.8],
    color: '#ffeac2', // Warm dining chandelier
    maxIntensity: 35.0,
    distance: 6.8,
    decay: 1.8,
    isOn: (state) => !!state.diningRoom.lightPower,
    getIntensityRatio: (state) =>
      state.diningRoom.lightPower
        ? Math.max(0, Math.min(100, state.diningRoom.lightIntensity ?? 100)) / 100
        : 0,
  },
  // 3. Kitchen (Far East-South)
  {
    id: 'kitchen',
    name: 'Kitchen',
    roomKey: 'kitchen',
    position: [5.6, 2.4, 2.6],
    hitboxPosition: [5.48, 1.0, 2.78],
    hitboxSize: [2.6, 2.0, 5.8],
    color: '#fff3db', // Clean warm task light
    maxIntensity: 35.0,
    distance: 6.8,
    decay: 1.8,
    isOn: (state) => !!state.kitchen.lightPower,
    getIntensityRatio: (state) =>
      state.kitchen.lightPower
        ? Math.max(0, Math.min(100, state.kitchen.lightIntensity ?? 100)) / 100
        : 0,
  },
  // 4. Master Bedroom (West-South)
  {
    id: 'bedroomMain',
    name: 'Master Bedroom',
    roomKey: 'bedroomMain',
    position: [-4.6, 2.4, 2.8],
    hitboxPosition: [-4.63, 1.0, 2.93],
    hitboxSize: [4.3, 2.0, 5.6],
    color: '#fed7aa', // Soft warm bedroom lighting
    maxIntensity: 38.0,
    distance: 7.5,
    decay: 1.8,
    isOn: (state) =>
      !!(
        state.bedroomMain.lightPower ||
        state.bedroomMain.lamp1Power ||
        state.bedroomMain.lamp2Power
      ),
    getIntensityRatio: (state) => {
      const main = state.bedroomMain.lightPower
        ? (state.bedroomMain.lightIntensity ?? 100) / 100
        : 0;
      const lamp1 = state.bedroomMain.lamp1Power
        ? (state.bedroomMain.lamp1Intensity ?? 100) / 100
        : 0;
      const lamp2 = state.bedroomMain.lamp2Power
        ? (state.bedroomMain.lamp2Intensity ?? 100) / 100
        : 0;
      return Math.max(main, lamp1 * 0.7, lamp2 * 0.7);
    },
  },
  // 5. Bedroom 2 (West-North)
  {
    id: 'bedroom2',
    name: 'Bedroom 2',
    roomKey: 'bedroom2',
    position: [-4.6, 2.4, -2.8],
    hitboxPosition: [-4.63, 1.0, -2.93],
    hitboxSize: [4.3, 2.0, 5.6],
    color: '#fed7aa', // Warm bedroom glow
    maxIntensity: 35.0,
    distance: 7.0,
    decay: 1.8,
    isOn: (state) => !!(state.bedroom2.lightPower || state.bedroom2.lampPower),
    getIntensityRatio: (state) => {
      const main = state.bedroom2.lightPower
        ? (state.bedroom2.lightIntensity ?? 100) / 100
        : 0;
      const lamp = state.bedroom2.lampPower
        ? (state.bedroom2.lampIntensity ?? 80) / 100
        : 0;
      return Math.max(main, lamp * 0.7);
    },
  },
  // 6. Main Bathroom / Bath 1 (Center-North-West)
  {
    id: 'bathroomMain',
    name: 'Main Bathroom',
    roomKey: 'bathroomMain',
    position: [-1.4, 2.3, -3.7],
    hitboxPosition: [-1.37, 1.0, -3.78],
    hitboxSize: [1.7, 2.0, 3.9],
    color: '#fef9c3', // Warm vanity illumination
    maxIntensity: 32.0,
    distance: 5.5,
    decay: 1.8,
    isOn: (state) => !!state.bathroomMain.lightPower,
    getIntensityRatio: (state) =>
      state.bathroomMain.lightPower
        ? Math.max(0, Math.min(100, state.bathroomMain.lightIntensity ?? 100)) / 100
        : 0,
  },
  // 7. Bathroom 2 / Guest Bath (Center-North-East)
  {
    id: 'bathroom2',
    name: 'Bathroom 2',
    roomKey: 'bathroom2',
    position: [0.6, 2.3, -3.7],
    hitboxPosition: [0.43, 1.0, -3.78],
    hitboxSize: [1.5, 2.0, 3.9],
    color: '#fef9c3', // Warm vanity & shower illumination
    maxIntensity: 32.0,
    distance: 5.5,
    decay: 1.8,
    isOn: (state) => !!state.bathroom2.lightPower,
    getIntensityRatio: (state) =>
      state.bathroom2.lightPower
        ? Math.max(0, Math.min(100, state.bathroom2.lightIntensity ?? 100)) / 100
        : 0,
  },
  // 8. Bedroom 3 / Studio (East-North-Mid)
  {
    id: 'bedroom3',
    name: 'Bedroom 3 / Studio',
    roomKey: 'bedroom3',
    position: [2.8, 2.4, -2.8],
    hitboxPosition: [2.66, 1.0, -3.08],
    hitboxSize: [2.5, 2.0, 5.3],
    color: '#fef3c7', // Warm studio glow
    maxIntensity: 34.0,
    distance: 6.5,
    decay: 1.8,
    isOn: (state) => !!(state.bedroom3.lightPower || state.bedroom3.lampPower),
    getIntensityRatio: (state) => {
      const main = state.bedroom3.lightPower
        ? (state.bedroom3.lightIntensity ?? 100) / 100
        : 0;
      const lamp = state.bedroom3.lampPower
        ? (state.bedroom3.lampIntensity ?? 50) / 100
        : 0;
      return Math.max(main, lamp * 0.7);
    },
  },
  // 9. Dedicated Garage Bay (Far East-North)
  {
    id: 'garage',
    name: 'Garage',
    roomKey: 'garage',
    position: [5.4, 2.4, -2.9],
    hitboxPosition: [5.48, 1.0, -3.08],
    hitboxSize: [2.6, 2.0, 5.3],
    color: '#f8fafc', // High-clarity white garage illumination
    maxIntensity: 38.0,
    distance: 7.0,
    decay: 1.8,
    isOn: (state) => !!(state.garage.lightPower || state.garage.garageDoorOpen),
    getIntensityRatio: (state) => {
      if (state.garage.lightPower) {
        return Math.max(0, Math.min(100, state.garage.lightIntensity ?? 100)) / 100;
      }
      return state.garage.garageDoorOpen ? 0.6 : 0;
    },
  },
  // 10. Front Porch Entrance
  {
    id: 'frontPorch',
    name: 'Front Porch',
    roomKey: 'livingRoom',
    position: [-0.5, 2.0, 6.2],
    hitboxPosition: [-0.5, 0.7, 6.45],
    hitboxSize: [2.8, 1.4, 1.3],
    color: '#fde047', // Warm welcoming entrance lantern
    maxIntensity: 30.0,
    distance: 5.5,
    decay: 1.8,
    isOn: (state) => !!state.livingRoom.mainDoorOpen,
    getIntensityRatio: (state) => (state.livingRoom.mainDoorOpen ? 1.0 : 0),
  },
];

function AnimatedRoomPointLight({
  config,
  targetIntensity,
}: {
  config: RoomLightConfig;
  targetIntensity: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const currentIntensity = useRef(targetIntensity);

  // Smoothly damp light intensity between 0 and proportional targetIntensity
  useFrame((_, delta) => {
    if (lightRef.current) {
      currentIntensity.current = THREE.MathUtils.damp(
        currentIntensity.current,
        targetIntensity,
        6,
        delta
      );
      lightRef.current.intensity = currentIntensity.current;
    }
  });

  return (
    <group position={config.position}>
      {/* Point light emitting warm illumination proportional to dimming slider */}
      <pointLight
        ref={lightRef}
        color={config.color}
        distance={config.distance}
        decay={config.decay}
        castShadow={false}
      />
    </group>
  );
}

function RoomClickableHitbox({
  config,
  onRoomClick,
}: {
  config: RoomLightConfig;
  onRoomClick?: (id: string, name: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <mesh
      position={config.hitboxPosition}
      onClick={(e) => {
        e.stopPropagation();
        onRoomClick?.(config.id, config.name);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        setHovered(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
        setHovered(false);
      }}
    >
      <boxGeometry args={config.hitboxSize} />
      <meshStandardMaterial
        color={config.color}
        transparent
        opacity={hovered ? 0.12 : 0}
        depthWrite={false}
        roughness={0.5}
        metalness={0.1}
      />
    </mesh>
  );
}

interface RoomLightSourcesProps {
  roomsState: AllRoomsState;
  onRoomClick?: (id: string, name: string) => void;
}

export function RoomLightSources({
  roomsState,
  onRoomClick,
}: RoomLightSourcesProps) {
  return (
    <group>
      {ROOM_LIGHT_CONFIGS.map((config) => {
        const ratio = config.getIntensityRatio(roomsState);
        const targetIntensity = config.maxIntensity * ratio;
        return (
          <group key={config.id}>
            <AnimatedRoomPointLight
              config={config}
              targetIntensity={targetIntensity}
            />
            <RoomClickableHitbox
              config={config}
              onRoomClick={onRoomClick}
            />
          </group>
        );
      })}
    </group>
  );
}
