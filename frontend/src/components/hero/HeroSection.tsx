import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { SkillConstellation } from './SkillConstellation';
import { CandidateProfile } from '../../types';

interface HeroSectionProps {
  profile: CandidateProfile;
  onExploreClick: () => void;
  onStartClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  profile,
  onExploreClick,
  onStartClick,
}) => {
  return (
    <section className="relative min-h-[92svh] flex flex-col justify-between pt-28 pb-12 sm:pb-16 overflow-hidden">
      {/* Delicate background grid and gradient accents */}
      <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-sap-50/70 via-surface-subtle to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: The Message */}
          <div className="lg:col-span-6 xl:col-span-6 text-left">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sap-600" />
              <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-slate-700">
                SAP HACKFEST 2026 / INCLUSIVE WORKFORCE
              </span>
            </motion.div>

            {/* Headline across two deliberate lines */}
            <div className="overflow-hidden mb-6">
              <motion.h1
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-ink-950 leading-[1.08]"
              >
                <span className="block">You’re not obsolete.</span>
                <span className="block text-sap-600 mt-1">You’re two skills away.</span>
              </motion.h1>
            </div>

            {/* Supporting Copy */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-xl mb-8"
            >
              Your experience still has value. Second Act helps workers displaced by AI discover
              the roles that are closer than you think—and pinpoint the exact skills that can bridge the gap.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5"
            >
              <button
                type="button"
                onClick={onStartClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-sap-600 hover:bg-sap-700 text-white font-semibold text-sm shadow-sm hover:shadow-glow-sap transition-all active:scale-[0.98] group"
              >
                <span>Discover your next role</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={onExploreClick}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-medium text-sm transition-all active:scale-[0.98]"
              >
                <span>See an example match</span>
              </button>
            </motion.div>

            {/* Micro proof snippet */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-8 flex items-center gap-3 text-xs text-slate-500 pt-4 border-t border-slate-200/60"
            >
              <div className="flex -space-x-1">
                <span className="w-5 h-5 rounded-full bg-sap-100 border border-white flex items-center justify-center text-[9px] font-bold text-sap-700">72%</span>
                <span className="w-5 h-5 rounded-full bg-gapAmber-100 border border-white flex items-center justify-center text-[9px] font-bold text-gapAmber-700">2</span>
              </div>
              <p>
                Illustrative case: <span className="font-medium text-slate-800">Harpreet (14 yrs Manual QA)</span> → QA Automation Engineer
              </p>
            </motion.div>
          </div>

          {/* Right Column: Signature Visual */}
          <div className="lg:col-span-6 xl:col-span-6 w-full">
            <SkillConstellation profile={profile} />
          </div>
        </div>
      </div>

      {/* Elegant scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="max-w-7xl mx-auto px-4 w-full flex justify-center pt-8 pointer-events-none"
      >
        <div className="flex flex-col items-center gap-1.5 text-slate-400">
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
            Scroll to explore
          </span>
          <ChevronDown className="w-4 h-4 animate-bounce text-slate-400" />
        </div>
      </motion.div>
    </section>
  );
};
