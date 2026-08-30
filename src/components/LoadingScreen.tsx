import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Home, ShieldCheck, Activity } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Synchronizing spatial sensors...');

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1400; // 1.4s smooth transition
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(nextProgress);

      if (nextProgress < 35) {
        setPhase('Connecting to local telemetry node...');
      } else if (nextProgress < 70) {
        setPhase('Loading architectural zone mapping...');
      } else if (nextProgress < 95) {
        setPhase('Synchronizing environmental states...');
      } else {
        setPhase('Spatial Twin Ready.');
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        setTimeout(onComplete, 150);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-2xl mx-auto min-h-[380px] rounded-3xl bg-[#121212]/90 border border-stone-800 backdrop-blur-md p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden"
    >
      {/* Background ambient sweep */}
      <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
        <div className="w-[320px] h-[320px] rounded-full border border-stone-700/40 animate-ping" />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-stone-600/30" />
      </div>

      {/* Central Icon Ring */}
      <div className="relative mb-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-200 shadow-xl">
          <Home className="w-8 h-8 sm:w-9 sm:h-9 animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-stone-950 border border-stone-700 flex items-center justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-stone-300" />
        </div>
      </div>

      {/* Title */}
      <h3 className="font-serif-heading text-xl sm:text-2xl text-stone-100 font-bold tracking-[0.1em] mb-1">
        INITIALIZING SPATIAL TWIN
      </h3>

      {/* Phase status */}
      <p className="text-xs sm:text-sm text-stone-400 font-mono flex items-center gap-2 mb-6 h-6">
        <Activity className="w-3.5 h-3.5 text-stone-300 animate-spin" />
        {phase}
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-md bg-stone-950 rounded-full h-2 p-0.5 border border-stone-800 overflow-hidden mb-2.5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-stone-600 via-stone-300 to-stone-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Percentage */}
      <div className="flex justify-between w-full max-w-md text-xs font-mono text-stone-400">
        <span>KEEPSAFE ENCLAVE</span>
        <span className="text-stone-200 font-semibold">{progress}%</span>
      </div>
    </motion.div>
  );
}
