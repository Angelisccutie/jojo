/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { HouseModel } from './HouseModel';
import { RoomLightSources, ROOM_LIGHT_CONFIGS } from './RoomLightSources';
import { WeatherEnvironment3D } from './WeatherEnvironment3D';
import type { AllRoomsState, WeatherCondition } from '../../types';
import {
  Compass,
  Upload,
  Lightbulb,
  Sun,
  Moon,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface House3DViewerProps {
  roomsState: AllRoomsState;
  setRoomsState?: React.Dispatch<React.SetStateAction<AllRoomsState>>;
  onDeviceAction?: (message: string) => void;
  currentWeather?: WeatherCondition;
}

export function House3DViewer({
  roomsState,
  setRoomsState,
  onDeviceAction,
  currentWeather = 'sunny',
}: House3DViewerProps) {
  // Custom GLB file loading state
  const [customGlbUrl, setCustomGlbUrl] = useState<string | null>(null);
  const [isExternalGlbLoaded, setIsExternalGlbLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual In-Scene Lighting Controls Panel Toggle
  const [isControlsOpen, setIsControlsOpen] = useState(true);

  // Camera preset controls ref
  const controlsRef = useRef<any>(null);

  // Custom GLB file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomGlbUrl(url);
    }
  };

  // Camera viewpoint presets
  const setCameraPreset = (preset: 'iso' | 'top' | 'front' | 'reset') => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    if (preset === 'iso') {
      controls.object.position.set(10, 11, 12);
      controls.target.set(0, 1.2, 0);
    } else if (preset === 'top') {
      controls.object.position.set(0, 16, 0.01);
      controls.target.set(0, 0, 0);
    } else if (preset === 'front') {
      controls.object.position.set(0, 4.2, 12);
      controls.target.set(0, 1.5, 2);
    } else {
      controls.object.position.set(10, 11, 12);
      controls.target.set(0, 1.2, 0);
    }
    controls.update();
  };

  // Toggle single room light
  const toggleRoomLight = (id: string, name: string) => {
    if (!setRoomsState) return;

    setRoomsState((prev) => {
      const updated = { ...prev };

      switch (id) {
        case 'livingRoom':
          updated.livingRoom = {
            ...prev.livingRoom,
            lightPower: !prev.livingRoom.lightPower,
          };
          break;
        case 'diningRoom':
          updated.diningRoom = {
            ...prev.diningRoom,
            lightPower: !prev.diningRoom.lightPower,
          };
          break;
        case 'kitchen':
          updated.kitchen = {
            ...prev.kitchen,
            lightPower: !prev.kitchen.lightPower,
          };
          break;
        case 'bedroomMain': {
          const next = !prev.bedroomMain.lightPower;
          updated.bedroomMain = {
            ...prev.bedroomMain,
            lightPower: next,
            lamp1Power: next,
            lamp2Power: next,
          };
          break;
        }
        case 'bedroom2': {
          const next = !prev.bedroom2.lightPower;
          updated.bedroom2 = {
            ...prev.bedroom2,
            lightPower: next,
            lampPower: next,
          };
          break;
        }
        case 'bedroom3': {
          const next = !prev.bedroom3.lightPower;
          updated.bedroom3 = {
            ...prev.bedroom3,
            lightPower: next,
            lampPower: next,
          };
          break;
        }
        case 'bathroomMain':
          updated.bathroomMain = {
            ...prev.bathroomMain,
            lightPower: !prev.bathroomMain.lightPower,
          };
          break;
        case 'bathroom2':
          updated.bathroom2 = {
            ...prev.bathroom2,
            lightPower: !prev.bathroom2.lightPower,
          };
          break;
        case 'garage': {
          const next = !prev.garage.lightPower;
          updated.garage = {
            ...prev.garage,
            lightPower: next,
          };
          break;
        }
        case 'frontPorch':
          updated.livingRoom = {
            ...prev.livingRoom,
            mainDoorOpen: !prev.livingRoom.mainDoorOpen,
          };
          break;
      }

      return updated;
    });

    onDeviceAction?.(`Toggled ${name} lighting in 3D scene`);
  };

  // Set single room light intensity (0-100)
  const setRoomLightIntensity = (id: string, intensity: number) => {
    if (!setRoomsState) return;
    const clamped = Math.max(0, Math.min(100, intensity));

    setRoomsState((prev) => {
      const updated = { ...prev };
      switch (id) {
        case 'livingRoom':
          updated.livingRoom = { ...prev.livingRoom, lightIntensity: clamped };
          break;
        case 'diningRoom':
          updated.diningRoom = { ...prev.diningRoom, lightIntensity: clamped };
          break;
        case 'kitchen':
          updated.kitchen = { ...prev.kitchen, lightIntensity: clamped };
          break;
        case 'bedroomMain':
          updated.bedroomMain = {
            ...prev.bedroomMain,
            lightIntensity: clamped,
            lamp1Intensity: clamped,
            lamp2Intensity: clamped,
          };
          break;
        case 'bedroom2':
          updated.bedroom2 = {
            ...prev.bedroom2,
            lightIntensity: clamped,
            lampIntensity: clamped,
          };
          break;
        case 'bedroom3':
          updated.bedroom3 = {
            ...prev.bedroom3,
            lightIntensity: clamped,
            lampIntensity: clamped,
          };
          break;
        case 'bathroomMain':
          updated.bathroomMain = { ...prev.bathroomMain, lightIntensity: clamped };
          break;
        case 'bathroom2':
          updated.bathroom2 = { ...prev.bathroom2, lightIntensity: clamped };
          break;
        case 'garage':
          updated.garage = { ...prev.garage, lightIntensity: clamped };
          break;
      }
      return updated;
    });
  };

  // Helper to read room light intensity
  const getRoomIntensity = (id: string): number => {
    switch (id) {
      case 'livingRoom':
        return roomsState.livingRoom.lightIntensity ?? 100;
      case 'diningRoom':
        return roomsState.diningRoom.lightIntensity ?? 100;
      case 'kitchen':
        return roomsState.kitchen.lightIntensity ?? 100;
      case 'bedroomMain':
        return roomsState.bedroomMain.lightIntensity ?? 100;
      case 'bedroom2':
        return roomsState.bedroom2.lightIntensity ?? 100;
      case 'bedroom3':
        return roomsState.bedroom3.lightIntensity ?? 100;
      case 'bathroomMain':
        return roomsState.bathroomMain.lightIntensity ?? 100;
      case 'bathroom2':
        return roomsState.bathroom2.lightIntensity ?? 100;
      case 'garage':
        return roomsState.garage.lightIntensity ?? 100;
      default:
        return 100;
    }
  };

  // Master All ON / All OFF
  const setAllLights = (enable: boolean) => {
    if (!setRoomsState) return;

    setRoomsState((prev) => ({
      ...prev,
      livingRoom: {
        ...prev.livingRoom,
        lightPower: enable,
      },
      diningRoom: {
        ...prev.diningRoom,
        lightPower: enable,
      },
      kitchen: {
        ...prev.kitchen,
        lightPower: enable,
      },
      bedroomMain: {
        ...prev.bedroomMain,
        lightPower: enable,
        lamp1Power: enable,
        lamp2Power: enable,
      },
      bedroom2: {
        ...prev.bedroom2,
        lightPower: enable,
        lampPower: enable,
      },
      bedroom3: {
        ...prev.bedroom3,
        lightPower: enable,
        lampPower: enable,
      },
      bathroomMain: {
        ...prev.bathroomMain,
        lightPower: enable,
      },
      bathroom2: {
        ...prev.bathroom2,
        lightPower: enable,
      },
      garage: {
        ...prev.garage,
        lightPower: enable,
      },
    }));

    onDeviceAction?.(enable ? 'Switched all house lights ON in 3D Scene' : 'Switched all house lights OFF in 3D Scene');
  };

  // Compute active illuminated rooms count
  const activeLightsCount = ROOM_LIGHT_CONFIGS.filter((c) =>
    c.isOn(roomsState)
  ).length;

  return (
    <div className="relative w-full h-[620px] rounded-3xl bg-slate-950/95 border border-slate-800 overflow-hidden shadow-2xl flex flex-col select-none">
      {/* 3D Scene Viewport */}
      <div className="relative w-full flex-1">
        <Canvas
          shadows
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.45,
          }}
        >
          {/* Framed closer so the 14-unit house fills the viewport prominently */}
          <PerspectiveCamera makeDefault position={[10, 11, 12]} fov={42} />
          <OrbitControls
            ref={controlsRef}
            makeDefault
            minDistance={3}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2 + 0.02}
            target={[0, 1.2, 0]}
            enableDamping
            dampingFactor={0.06}
          />

          {/* Dynamic Weather Sky & Particles System (Sunny / Rainy / Winter) */}
          <WeatherEnvironment3D weather={currentWeather} />

          {/* Ground Shadow Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
            <planeGeometry args={[48, 48]} />
            <shadowMaterial opacity={0.45} />
          </mesh>

          <Suspense fallback={null}>
            {/* The Auto-Fitted and Centered House Model */}
            <HouseModel
              customGlbUrl={customGlbUrl}
              onModelLoaded={(isCustom) => setIsExternalGlbLoaded(isCustom)}
            />

            {/* Dynamic Proportional PointLights and Interactive 3D Room Hitboxes */}
            <RoomLightSources
              roomsState={roomsState}
              onRoomClick={(id, name) => toggleRoomLight(id, name)}
            />
          </Suspense>
        </Canvas>

        {/* Top Control Overlay Toolbar */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-10">
          {/* Left: View Title & Camera Presets */}
          <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-lg">
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>3D Spatial View</span>
            </span>

            <div className="h-3.5 w-px bg-slate-800 mx-1" />

            <button
              id="btn-3d-iso"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCameraPreset('iso');
              }}
              className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Isometric 3D Perspective"
            >
              3D Iso
            </button>
            <button
              id="btn-3d-floorplan"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCameraPreset('top');
              }}
              className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Top-Down Floorplan"
            >
              Floorplan
            </button>
            <button
              id="btn-3d-entrance"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCameraPreset('front');
              }}
              className="px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Front Entrance View"
            >
              Entrance
            </button>
          </div>

          {/* Right: Active Illumination Status, Controls Panel Toggle & GLB Loader */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Toggle In-Scene Controls Drawer */}
            <button
              id="toggle-scene-controls-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsControlsOpen((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-mono flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                isControlsOpen
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                  : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:bg-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
              <span>Room Lights</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-bold font-mono">
                {activeLightsCount}/{ROOM_LIGHT_CONFIGS.length}
              </span>
              {isControlsOpen ? (
                <ChevronUp className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* Custom GLB Loader */}
            <button
              id="upload-custom-glb-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              title="Load custom .glb 3D house model"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">
                {isExternalGlbLoaded ? 'Custom GLB' : 'Load .GLB'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Floating Manual Room Light Controls Panel (Directly inside the 3D Scene) */}
        {isControlsOpen && (
          <div className="absolute top-16 right-4 w-72 max-h-[460px] bg-slate-950/92 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl z-20 flex flex-col pointer-events-auto">
            {/* Header & Quick Master Toggles */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Lightbulb
                  className={`w-4 h-4 ${
                    activeLightsCount > 0 ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                <span className="text-xs font-semibold text-white tracking-wide">
                  Scene Lighting
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  id="btn-all-lights-on"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAllLights(true);
                  }}
                  className="px-2 py-0.8 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-mono text-amber-300 transition-colors cursor-pointer"
                >
                  All ON
                </button>
                <button
                  id="btn-all-lights-off"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAllLights(false);
                  }}
                  className="px-2 py-0.8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-slate-300 transition-colors cursor-pointer"
                >
                  All OFF
                </button>
              </div>
            </div>

            {/* Room Light Switches List */}
            <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {ROOM_LIGHT_CONFIGS.map((config) => {
                const isOn = config.isOn(roomsState);
                const intensity = getRoomIntensity(config.id);
                return (
                  <div
                    key={config.id}
                    className={`p-2.5 rounded-xl transition-all border ${
                      isOn
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-sm'
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-400'
                    }`}
                  >
                    {/* Top Row: Room Name & ON/OFF Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                            isOn
                              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                              : 'bg-slate-700'
                          }`}
                        />
                        <span className="text-xs font-medium truncate text-slate-200">
                          {config.name}
                        </span>
                      </div>

                      <button
                        id={`toggle-light-${config.id}`}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleRoomLight(config.id, config.name);
                        }}
                        className="flex items-center gap-2 shrink-0 cursor-pointer focus:outline-none"
                      >
                        <span
                          className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                            isOn
                              ? 'bg-amber-400/20 text-amber-300'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                        <div
                          className={`w-7 h-4 rounded-full transition-colors relative p-0.5 ${
                            isOn ? 'bg-amber-500' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white transition-transform ${
                              isOn ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </button>
                    </div>

                    {/* Dimmer Slider Row */}
                    {config.id !== 'frontPorch' && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-2">
                        <Sun
                          className={`w-3 h-3 shrink-0 ${
                            isOn ? 'text-amber-400' : 'text-slate-600'
                          }`}
                        />
                        <input
                          id={`slider-light-${config.id}`}
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={intensity}
                          onChange={(e) => {
                            e.stopPropagation();
                            setRoomLightIntensity(config.id, Number(e.target.value));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all bg-slate-800 ${
                            isOn ? 'accent-amber-400' : 'accent-slate-500 opacity-60'
                          }`}
                          aria-label={`${config.name} light intensity`}
                        />
                        <span
                          className={`text-[10px] font-mono shrink-0 w-8 text-right font-medium ${
                            isOn ? 'text-amber-300' : 'text-slate-500'
                          }`}
                        >
                          {intensity}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Helper Hint Bar */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2 shadow-lg">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Click any room in 3D to toggle lighting • Real-time sync with dashboard & voice • Drag to orbit
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400">
            {activeLightsCount > 0 ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Sun className="w-3.5 h-3.5 animate-pulse" />
                <span>{activeLightsCount} Zones Illuminated</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Moon className="w-3.5 h-3.5" />
                <span>Night Mode Baseline</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
