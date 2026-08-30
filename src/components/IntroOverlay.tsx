/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Home, ArrowRight } from 'lucide-react';

interface IntroOverlayProps {
  onComplete: () => void;
}

export function IntroOverlay({ onComplete }: IntroOverlayProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canSkip, setCanSkip] = useState(false);

  const completedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());

  // Letters of the logo for staggered letter-by-letter reveal
  const logoLetters = useMemo(() => ['K', 'E', 'E', 'P', 'S', 'A', 'F', 'E'], []);

  // Allow skip button to fade in smoothly after 800ms
  useEffect(() => {
    const skipTimer = setTimeout(() => {
      setCanSkip(true);
    }, 800);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(skipTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Slowed, luxurious progress engine running for ~4.8s total duration
  useEffect(() => {
    const totalDuration = 4800; // 4.8 seconds for deliberate, unhurried brand immersion
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (completedRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const linearRatio = Math.min(elapsed / totalDuration, 1);
      
      // Eased progress curve (gentle acceleration with smooth cinematic deceleration)
      const easedProgress = Math.min(
        100,
        Math.round((1 - Math.pow(1 - linearRatio, 2.8)) * 100)
      );

      setProgress(easedProgress);

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        setProgress(100);
        
        // Brief hold at 100% before smooth fade out
        setTimeout(() => {
          triggerExit();
        }, 320);
      }
    }, 30);

    return () => clearInterval(interval);
  }, []);

  const triggerExit = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 700); // 700ms exit fade
  };

  const handleSkip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          id="intro-overlay"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.015,
            filter: 'blur(8px)',
          }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed inset-0 z-[200] bg-[#070707] flex flex-col items-center justify-center select-none overflow-hidden p-6"
        >
          {/* Subtle Ambient Vignette & Micro Grain */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-stone-500/5 rounded-full blur-[180px]" />
          </div>

          {/* Top Right "Skip →" Button */}
          <AnimatePresence>
            {canSkip && (
              <motion.button
                id="intro-skip-btn"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={handleSkip}
                className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30 px-3.5 py-1.5 rounded-full bg-stone-900/60 hover:bg-stone-800/80 border border-stone-800/80 text-[11px] font-mono text-stone-400 hover:text-stone-100 flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md hover:border-stone-700 active:scale-95 group"
                title="Skip intro animation"
              >
                <span>Skip</span>
                <ArrowRight className="w-3 h-3 text-stone-500 group-hover:text-stone-300 group-hover:translate-x-0.5 transition-all" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Centered Main Brand Composition */}
          <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-xl w-full">
            
            {/* 1. Status Pill Badge: ● SPATIAL ENCLAVE • ONLINE */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#121212]/90 border border-stone-800/80 mb-7 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-stone-200 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.24em] text-stone-400 uppercase font-medium">
                SPATIAL ENCLAVE • ONLINE
              </span>
            </motion.div>

            {/* 2. Emblem Box with Shield & Nested Mini-Home Badge */}
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-7"
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#141414] border border-stone-800 flex items-center justify-center text-stone-100 shadow-[0_4px_24px_rgba(0,0,0,0.6)] relative">
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-stone-200 stroke-[1.6]" />
                
                {/* Mini Home icon at bottom right */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#0a0a0a] border border-stone-750 flex items-center justify-center">
                  <Home className="w-3 h-3 text-stone-300 stroke-[1.8]" />
                </div>
              </div>
            </motion.div>

            {/* 3. "KEEPSAFE" Wordmark Letter-by-Letter Staged Entrance */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4 overflow-visible">
              {logoLetters.map((char, index) => (
                <motion.span
                  key={index}
                  initial={{
                    opacity: 0,
                    y: 18,
                    filter: 'blur(6px)',
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.75 + index * 0.065, // Gentle, deliberate letter ripple
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="font-serif-heading text-5xl sm:text-7xl md:text-8xl text-white font-normal tracking-[0.14em] sm:tracking-[0.18em] inline-block select-none"
                >
                  {char}
                </motion.span>
              ))}
            </div>

            {/* 4. Tagline: EXTERIOR INTELLIGENCE • INTERIOR / COMFORT */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              <p className="text-[10px] sm:text-[11.5px] font-mono tracking-[0.24em] text-stone-400 uppercase leading-relaxed max-w-sm mx-auto">
                <span>EXTERIOR INTELLIGENCE</span>
                <span className="mx-2 text-stone-600">•</span>
                <span>INTERIOR</span>
                <br />
                <span>COMFORT</span>
              </p>
            </motion.div>

            {/* 5. Minimal Elegant Horizontal Loading Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
              className="w-36 sm:w-44 h-[2px] bg-stone-900/90 rounded-full overflow-hidden relative"
            >
              <motion.div
                className="h-full bg-stone-200 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
