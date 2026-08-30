/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { CursorGlow } from './components/CursorGlow';
import { BackgroundAmbient } from './components/BackgroundAmbient';
import { IntroOverlay } from './components/IntroOverlay';
import { HeroAboutSection } from './components/HeroAboutSection';
import { QuickDashboard } from './components/QuickDashboard';
import { LoadingScreen } from './components/LoadingScreen';
import { HomeAIScreen } from './components/HomeAIScreen';
import { FloatingVoiceWidget } from './components/FloatingVoiceWidget';
import { useWakeWordEngine } from './hooks/useWakeWordEngine';
import { AcPowerSavingModal, type AcPowerSavingPromptData } from './components/AcPowerSavingModal';
import { WeatherConfirmationModal, type WeatherPromptData } from './components/WeatherConfirmationModal';
import { RoutineLocationModal } from './components/RoutineLocationModal';
import type {
  AllRoomsState,
  ViewMode,
  PreferenceRule,
  TranscriptMessage,
  WeatherCondition,
  TemperatureUnit,
  RoutinePromptData,
} from './types';

export default function App() {
  const [introFinished, setIntroFinished] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [currentWeather, setCurrentWeather] = useState<WeatherCondition>('sunny');
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('F');

  // Interactive Prompt Modals
  const [acPromptData, setAcPromptData] = useState<AcPowerSavingPromptData | null>(null);
  const [weatherPromptData, setWeatherPromptData] = useState<WeatherPromptData | null>(null);
  const [routinePromptData, setRoutinePromptData] = useState<RoutinePromptData | null>(null);
  const dismissedSuggestionsRef = useRef<Set<string>>(new Set());

  // Shared Multi-Room Home State for 9 full zones
  const [roomsState, setRoomsState] = useState<AllRoomsState>({
    livingRoom: {
      lightPower: true,
      lightIntensity: 85,
      mainDoorOpen: false,
      fanPower: true,
      fanSpeed: 60,
      fanMode: 'med',
      acPower: true,
      acTemp: 72,
    },
    bedroomMain: {
      lightPower: true,
      lightIntensity: 80,
      lamp1Power: true,
      lamp1Intensity: 70,
      lamp2Power: true,
      lamp2Intensity: 45,
      acPower: true,
      acTemp: 68,
    },
    bedroom2: {
      lightPower: false,
      lightIntensity: 75,
      lampPower: false,
      lampIntensity: 80,
      acPower: false,
      acTemp: 72,
      fanPower: false,
      fanSpeed: 50,
      fanMode: 'low',
    },
    bedroom3: {
      lightPower: false,
      lightIntensity: 70,
      lampPower: false,
      lampIntensity: 50,
      acPower: false,
      acTemp: 74,
    },
    diningRoom: {
      lightPower: true,
      lightIntensity: 90,
      acPower: true,
      acTemp: 71,
    },
    kitchen: {
      lightPower: true,
      lightIntensity: 100,
      chimneyPower: false,
      chimneySpeed: 'med',
      windowOpen: false,
    },
    bathroomMain: {
      lightPower: true,
      lightIntensity: 85,
      exhaustFanPower: true,
      exhaustFanSpeed: 60,
      exhaustFanMode: 'med',
    },
    bathroom2: {
      lightPower: false,
      lightIntensity: 80,
      exhaustFanPower: false,
      exhaustFanSpeed: 50,
      exhaustFanMode: 'off',
    },
    garage: {
      garageDoorOpen: false,
      lightPower: false,
      lightIntensity: 100,
    },
  });

  // Shared Stored Rules & Preferences (Starts empty so one-time weather confirmation prompts trigger)
  const [preferences, setPreferences] = useState<PreferenceRule[]>([]);

  // Shared Voice & Chat Interaction Transcript
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: "Welcome to KeepSafe Home AI. I'm connected to all 9 zones in your house. Say \"Hey KeepSafe\" from anywhere or hold the push-to-talk button to give commands.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'chat',
    },
  ]);

  // Global Site-Wide Wake-Word Engine ("Hey KeepSafe")
  const {
    isWidgetOpen,
    openWidget,
    closeWidget,
    orbState,
    interimTranscript,
    lastCommandResult,
    lastDeviceUpdates,
    isListeningActive,
    isPushToTalkActive,
    followUpCountdown,
    routinePromptData: floatingRoutineData,
    speechError,
    apiKeyStatus,
    handleSelectRoutineOption,
    processCommandText,
    toggleMic,
    startPushToTalk,
    stopPushToTalk,
  } = useWakeWordEngine({
    roomsState,
    setRoomsState,
    preferences,
    setPreferences,
    transcriptHistory,
    setTranscriptHistory,
    currentWeather,
  });

  const handleIntroComplete = () => {
    setIntroFinished(true);
    try {
      sessionStorage.setItem('keepsafe_intro_seen', 'true');
    } catch {
      // ignore
    }
  };

  const handleReplayIntro = () => {
    setIntroFinished(false);
  };

  const handleAccessHome = () => {
    setViewMode('loading');
  };

  const handleLoadingComplete = () => {
    setViewMode('layout');
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
  };

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] text-stone-300 selection:bg-stone-800 selection:text-stone-100 flex flex-col justify-between">
      {/* Intro Animation Gating Access with Instant Skip */}
      {!introFinished && (
        <IntroOverlay onComplete={handleIntroComplete} />
      )}

      {/* Ambient Background & Grid */}
      <BackgroundAmbient />

      {/* Subtle High-Performance Cursor Glow */}
      <CursorGlow />

      {/* Interactive Power Optimization Modal */}
      <AcPowerSavingModal
        data={acPromptData}
        tempUnit={tempUnit}
        onClose={() => setAcPromptData(null)}
      />

      {/* Atmospheric Trigger Confirmation Modal */}
      <WeatherConfirmationModal
        data={weatherPromptData}
        onClose={() => setWeatherPromptData(null)}
      />

      {/* Routine Location Clarification Modal */}
      <RoutineLocationModal
        data={routinePromptData}
        onClose={() => setRoutinePromptData(null)}
      />

      {/* Global Floating Voice Assistant Widget (Summoned via "Hey KeepSafe") */}
      <FloatingVoiceWidget
        isOpen={isWidgetOpen}
        onClose={closeWidget}
        orbState={orbState}
        interimTranscript={interimTranscript}
        lastCommandResult={lastCommandResult}
        lastDeviceUpdates={lastDeviceUpdates}
        isListening={isListeningActive}
        followUpCountdown={followUpCountdown}
        routinePromptData={floatingRoutineData}
        onSelectRoutineOption={handleSelectRoutineOption}
        onSubmitText={processCommandText}
        onToggleMic={toggleMic}
      />

      {/* Global Wake Word Status Trigger Button */}
      {!isWidgetOpen && (
        <button
          id="summon-keepsafe-wake-btn"
          type="button"
          onClick={openWidget}
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-950/85 hover:bg-stone-900 border border-stone-800 text-stone-300 hover:text-stone-100 backdrop-blur-xl shadow-lg transition-all text-xs font-mono group cursor-pointer"
          title="Say 'Hey KeepSafe' or click to summon voice assistant"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          <span className="text-[11px] font-medium text-stone-400 group-hover:text-stone-200">
            Say <strong className="text-amber-300 font-semibold">&ldquo;Hey KeepSafe&rdquo;</strong>
          </span>
        </button>
      )}

      {/* Main Responsive Content Area */}
      <div
        className={`relative z-10 w-full flex-1 transition-opacity duration-500 ease-out ${
          introFinished ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {viewMode === 'dashboard' && (
          <div className="w-full">
            {/* SECTION 1 — Hero / About */}
            <HeroAboutSection />

            {/* SECTION 2 — Multi-Room Quick Dashboard */}
            <QuickDashboard
              roomsState={roomsState}
              setRoomsState={setRoomsState}
              onAccessHome={handleAccessHome}
              tempUnit={tempUnit}
              setTempUnit={setTempUnit}
              onRequestAcOptimization={(prompt) => setAcPromptData(prompt)}
              dismissedSuggestionsRef={dismissedSuggestionsRef}
              onRequestRoutinePrompt={(data) => setRoutinePromptData(data)}
              setTranscriptHistory={setTranscriptHistory}
            />
          </div>
        )}

        {viewMode === 'loading' && (
          <div className="min-h-[85vh] flex items-center justify-center p-4">
            <LoadingScreen onComplete={handleLoadingComplete} />
          </div>
        )}

        {viewMode === 'layout' && (
          <div className="min-h-screen pt-4 sm:pt-8 pb-16 px-3 sm:px-6 lg:px-8">
            <HomeAIScreen
              onBack={handleBackToDashboard}
              roomsState={roomsState}
              setRoomsState={setRoomsState}
              preferences={preferences}
              setPreferences={setPreferences}
              transcriptHistory={transcriptHistory}
              setTranscriptHistory={setTranscriptHistory}
              currentWeather={currentWeather}
              setCurrentWeather={setCurrentWeather}
              onRequestWeatherConfirmation={(data) => setWeatherPromptData(data)}
              onRequestRoutinePrompt={(data) => setRoutinePromptData(data)}
              startPushToTalk={startPushToTalk}
              stopPushToTalk={stopPushToTalk}
              isPushToTalkActive={isPushToTalkActive}
              orbState={orbState}
              interimTranscript={interimTranscript}
              speechError={speechError}
              apiKeyStatus={apiKeyStatus}
              processCommandText={processCommandText}
            />
          </div>
        )}
      </div>
    </main>
  );
}
