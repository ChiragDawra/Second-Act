import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { CandidateProfile } from '../../types';
import { Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface CareerBridgeSectionProps {
  profile: CandidateProfile;
}

export const CareerBridgeSection: React.FC<CareerBridgeSectionProps> = ({ profile }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 'step-1',
      title: 'The Perceived Chasm',
      subtitle: 'When displaced by AI, workers fear they must restart from square zero.',
      stat: '0% Recognized by legacy keyword ATS',
    },
    {
      id: 'step-2',
      title: 'Transferable Pillars Extend',
      subtitle: '14 years of domain mastery, defect triage, and requirement design form 72% of the span.',
      stat: '4 Verified Core Competencies',
    },
    {
      id: 'step-3',
      title: 'Targeting The Keystones',
      subtitle: 'Only 2 micro-skills are absent: Playwright scripting syntax and CI/CD pipelines.',
      stat: '2 Focused Skill Deltas',
    },
    {
      id: 'step-4',
      title: 'The Bridge Locks In',
      subtitle: 'The gap closes. The target role is reachable in weeks, not years.',
      stat: '72% Immediate Adjacency Match',
    },
  ];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Create scroll-driven trigger that updates the active step
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=1600',
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          const progress = self.progress;
          if (progress < 0.25) {
            setActiveStep(0);
          } else if (progress < 0.55) {
            setActiveStep(1);
          } else if (progress < 0.82) {
            setActiveStep(2);
          } else {
            setActiveStep(3);
          }
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="insight"
      ref={sectionRef}
      className="relative min-h-screen py-20 bg-ink-950 text-white flex flex-col justify-between overflow-hidden"
    >
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:28px_28px] opacity-40 pointer-events-none" />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-sap-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto z-10">
        {/* Section Headline */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-sap-400" />
            <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-slate-300">
              The Core Architectural Insight
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            “Displacement is a proximity problem, <br />
            <span className="text-sap-400">not total skill loss.”</span>
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Scroll down or select stages below to see how Second Act converts an intimidating career chasm into an engineered bridge.
          </p>
        </div>

        {/* Step Indicator Tabs (Accessible & Clickable) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-4xl mx-auto mb-10">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeStep === idx
                  ? 'bg-slate-800/90 border-sap-500 shadow-glow-sap'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider block text-slate-400">
                0{idx + 1}
              </span>
              <span className="text-xs font-semibold text-white block mt-0.5 truncate">
                {step.title}
              </span>
            </button>
          ))}
        </div>

        {/* Visual Bridge Visualization Canvas */}
        <div
          ref={containerRef}
          className="relative max-w-5xl mx-auto bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden"
        >
          {/* Status bar */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800/80 mb-8">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Current Sequence
              </span>
              <h4 className="text-base font-bold text-white">
                {steps[activeStep].title}
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-semibold text-sap-400 bg-sap-950/80 border border-sap-800 px-2.5 py-1 rounded-md">
                {steps[activeStep].stat}
              </span>
            </div>
          </div>

          {/* Bridge Stage Graphic */}
          <div className="relative h-[220px] sm:h-[260px] flex items-center justify-between px-2 sm:px-6">
            {/* Left Cliff: Source Role (Manual QA Tester) */}
            <div className="relative z-20 flex flex-col items-center">
              <div className="w-24 sm:w-32 p-3.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-center shadow-lg">
                <span className="text-[9px] font-mono uppercase text-slate-400 block">
                  Origin Role
                </span>
                <span className="text-xs font-bold text-white block mt-0.5 leading-tight">
                  {profile.currentRole}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  14 yrs foundation
                </span>
              </div>
              <div className="w-2.5 h-16 sm:h-20 bg-slate-700 rounded-b mt-1" />
            </div>

            {/* The Bridge Construction Area */}
            <div className="flex-1 relative mx-4 sm:mx-8 h-full flex flex-col justify-center">
              {/* Dynamic Connecting Bridge Track */}
              <div className="relative w-full h-12 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center px-4 overflow-hidden">
                {/* Stage 1: Empty Chasm Warning */}
                {activeStep === 0 && (
                  <div className="w-full text-center">
                    <span className="text-xs font-mono text-red-400/90 animate-pulse">
                      ▲ Insurmountable Chasm (Legacy ATS Perception)
                    </span>
                  </div>
                )}

                {/* Stage 2: Transferable Pillars (Blue Bars) */}
                {activeStep >= 1 && (
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: activeStep >= 3 ? '100%' : '72%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-6 bg-gradient-to-r from-sap-600 to-sap-500 rounded-lg flex items-center justify-between px-3 text-white text-[10px] font-semibold tracking-wide shadow-glow-sap relative"
                  >
                    <span>4 Transferable Competencies (72% Span)</span>
                    {activeStep < 2 && (
                      <span className="text-sap-200 font-mono">Span Extending...</span>
                    )}
                  </motion.div>
                )}

                {/* Stage 3: The 2 Keystones (Amber Insert) */}
                {activeStep >= 2 && activeStep < 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="ml-2 h-6 px-2.5 bg-gapAmber-500 text-gapAmber-950 font-bold text-[10px] rounded-md flex items-center gap-1 shadow-glow-amber animate-pulse"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>2 Keystone Gaps (28%)</span>
                  </motion.div>
                )}

                {/* Stage 4: Fully Locked Bridge */}
                {activeStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-sap-600 via-sky-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold tracking-wider uppercase"
                  >
                    <span>✓ Bridge Locked • Harpreet Transition Ready</span>
                  </motion.div>
                )}
              </div>

              {/* Transferable Skills Badges (Underneath Bridge) */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {activeStep >= 1 && (
                  <>
                    <span className="px-2 py-0.5 rounded bg-sap-950/80 border border-sap-800 text-[10px] text-sap-300">
                      Test-Case Design
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sap-950/80 border border-sap-800 text-[10px] text-sap-300">
                      Defect Triage
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sap-950/80 border border-sap-800 text-[10px] text-sap-300">
                      Banking Domain
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sap-950/80 border border-sap-800 text-[10px] text-sap-300">
                      Requirement Analysis
                    </span>
                  </>
                )}
                {activeStep >= 2 && (
                  <>
                    <span className="px-2 py-0.5 rounded bg-gapAmber-950/80 border border-gapAmber-600 text-[10px] text-gapAmber-300 font-semibold">
                      + Playwright Scripting
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gapAmber-950/80 border border-gapAmber-600 text-[10px] text-gapAmber-300 font-semibold">
                      + CI/CD GitHub Actions
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right Cliff: Destination Role (QA Automation Engineer) */}
            <div className="relative z-20 flex flex-col items-center">
              <div
                className={`w-24 sm:w-32 p-3.5 rounded-xl text-center shadow-lg transition-all ${
                  activeStep === 3
                    ? 'bg-sap-600 border-2 border-sap-300 shadow-glow-sap scale-105'
                    : 'bg-slate-800 border-2 border-slate-700 opacity-80'
                }`}
              >
                <span className="text-[9px] font-mono uppercase text-slate-300 block">
                  Target Role
                </span>
                <span className="text-xs font-bold text-white block mt-0.5 leading-tight">
                  {profile.targetRole}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                  High Market Demand
                </span>
              </div>
              <div className="w-2.5 h-16 sm:h-20 bg-slate-700 rounded-b mt-1" />
            </div>
          </div>

          {/* Narrative Explanation Footer */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p className="max-w-xl text-center sm:text-left">
              <strong className="text-white font-semibold">{steps[activeStep].title}: </strong>
              {steps[activeStep].subtitle}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500">
                Stage {activeStep + 1} of 4
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
