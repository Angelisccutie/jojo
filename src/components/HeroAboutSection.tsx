import { motion } from 'motion/react';
import { CloudRain, Zap, Mic } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

export function HeroAboutSection() {
  return (
    <section
      id="hero-about-section"
      className="w-full pt-10 sm:pt-16 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center relative z-10"
    >
      {/* Primary single system badge */}
      <ScrollReveal delay={0} distance={12}>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-900/90 border border-stone-800 mb-6 sm:mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.2em] text-stone-300 uppercase">
            KEEPSAFE CONTEXTUAL ENGINE
          </span>
        </div>
      </ScrollReveal>

      {/* Main Headline with Clean Fade */}
      <ScrollReveal delay={0.06} distance={18}>
        <h1 className="font-serif-heading text-4xl sm:text-6xl md:text-7xl text-stone-100 tracking-tight leading-[1.08] mb-5 sm:mb-6 font-semibold">
          Outside intelligence.<br />
          <span className="text-stone-400 font-editorial italic font-normal">
            Inside sanctuary.
          </span>
        </h1>
      </ScrollReveal>

      {/* Subtitle with Clean Fade */}
      <ScrollReveal delay={0.12} distance={14}>
        <p className="text-sm sm:text-base md:text-lg text-stone-400 max-w-2xl mx-auto font-normal leading-relaxed mb-8 sm:mb-12 text-balance">
          An autonomous home operating layer that unifies voice commands with live atmospheric conditions — protecting doors, conserving power, and tailoring room climate in real time.
        </p>
      </ScrollReveal>

      {/* Asymmetric Bento Showcase: 1 Primary Featured Anchor Card + 2 Stacked Lateral Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 text-left w-full max-w-5xl mx-auto">
        {/* Primary Large Anchor Card: Environmental Sensing & Weather Bridge */}
        <ScrollReveal delay={0.16} distance={20} className="md:col-span-7 flex flex-col">
          <div className="h-full p-5 sm:p-7 rounded-2xl bg-[#121212]/90 border border-stone-800 hover:border-stone-700 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300">
                  <CloudRain className="w-5 h-5" />
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-stone-100 mb-2 font-serif-heading tracking-wide">
                Environmental Sensing & Instant Protection
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                KeepSafe continuously parses atmospheric conditions. When rain, high wind, or freezing cold is detected, it automatically locks exterior doors, closes windows, and adjusts HVAC zones before drafts enter.
              </p>
            </div>

            {/* Micro Telemetry Preview inside Card */}
            <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-stone-800/80 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg bg-stone-950/80 border border-stone-800/80">
                <span className="text-[9px] sm:text-[10px] font-mono text-stone-400 block">
                  Weather Watched
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-200 mt-0.5 block">
                  Rain, Wind, Cold
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-lg bg-stone-950/80 border border-stone-800/80">
                <span className="text-[9px] sm:text-[10px] font-mono text-stone-400 block">
                  Monitored Zones
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-200 mt-0.5 block">
                  9 Active Rooms
                </span>
              </div>
              <div className="p-2 sm:p-2.5 rounded-lg bg-stone-950/80 border border-stone-800/80">
                <span className="text-[9px] sm:text-[10px] font-mono text-stone-400 block">
                  Reacts In
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-200 mt-0.5 block">
                  Under 1 Second
                </span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Stacked Complementary Column (5 cols on md) */}
        <div className="md:col-span-5 flex flex-col gap-4 sm:gap-5">
          {/* Energy Conservation */}
          <ScrollReveal delay={0.22} distance={20} className="flex-1 flex flex-col">
            <div className="h-full p-5 sm:p-6 rounded-2xl bg-[#121212]/90 border border-stone-800 hover:border-stone-700 transition-colors flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-stone-100 font-serif-heading tracking-wide">
                  Energy Conservation
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Provides proactive power-saving guidance before running high-draw thermal systems, balancing comfort with conservation.
              </p>
            </div>
          </ScrollReveal>

          {/* Voice & Persistent Automation Rules */}
          <ScrollReveal delay={0.28} distance={20} className="flex-1 flex flex-col">
            <div className="h-full p-5 sm:p-6 rounded-2xl bg-[#121212]/90 border border-stone-800 hover:border-stone-700 transition-colors flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-300 shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-stone-100 font-serif-heading tracking-wide">
                  Voice & Saved Rules
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                Issue natural spoken instructions or set persistent rules like <span className="text-stone-200">&ldquo;Close windows when it rains&rdquo;</span> that trigger automatically.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
