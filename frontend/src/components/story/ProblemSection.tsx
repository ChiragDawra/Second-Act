import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { CandidateProfile } from '../../types';

interface ProblemSectionProps {
  profile: CandidateProfile;
  onJumpToBridge: () => void;
}

export const ProblemSection: React.FC<ProblemSectionProps> = ({ profile, onJumpToBridge }) => {
  return (
    <section id="problem" className="py-24 sm:py-32 relative bg-surface-subtle border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200/70 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-red-700">
              The Structural Failure
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink-950 leading-[1.15]">
            The system sees missing keywords. <br className="hidden sm:inline" />
            <span className="text-slate-500 font-normal">Not years of experience.</span>
          </h2>

          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
            Conventional recruitment software operates on binary keyword matching. When an enterprise automates QA or data entry, senior professionals are instantly filtered out—ignoring the high-value institutional judgment they built over decades.
          </p>
        </div>

        {/* Narrative & Visual Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left Column: Harpreet's Human Story Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-8 border border-slate-200/80 shadow-premium flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Case Study 01
                  </span>
                  <h3 className="text-xl font-bold text-ink-950 mt-0.5">
                    {profile.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {profile.age} years old • {profile.location}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                  {profile.experienceYears} Years Tenure
                </div>
              </div>

              {/* Story Narrative */}
              <div className="py-6 space-y-4">
                <blockquote className="text-sm font-medium text-slate-700 italic border-l-2 border-sap-500 pl-4 py-1">
                  "{profile.storyQuote}"
                </blockquote>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Harpreet spent 14 years mastering complex financial ledgers, preventing high-stakes banking defect leaks, and mentoring junior testers. When his department shifted toward automated CI/CD pipelines, automated ATS screening flagged his resume as <strong className="text-ink-950 font-semibold">unqualified</strong> simply because it lacked two scripting libraries.
                </p>

                {/* Transferable assets vs gap breakdown */}
                <div className="pt-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                    Verified Transferable Foundation
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.existingSkills.map((skill) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sap-50 border border-sap-200 text-[11px] font-medium text-sap-800"
                      >
                        <CheckCircle2 className="w-3 h-3 text-sap-600" />
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                    The 2 Missing Keywords That Caused Rejection
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skillGaps.map((gap) => (
                      <span
                        key={gap.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gapAmber-50 border border-gapAmber-300 text-[11px] font-medium text-gapAmber-900"
                      >
                        <AlertTriangle className="w-3 h-3 text-gapAmber-600" />
                        {gap.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Displacement Reason: Perceived Tool Obsolescence
              </span>
              <button
                type="button"
                onClick={onJumpToBridge}
                className="text-xs font-semibold text-sap-600 hover:text-sap-700 flex items-center gap-1 group"
              >
                <span>See the bridge</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Right Column: ATS Breakdown Comparison Graphic */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            {/* The ATS Filter Card (The Broken Model) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl p-6 sm:p-7 border border-red-100 shadow-subtle relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-red-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Standard ATS Keyword Screener
                    </h4>
                    <p className="text-[11px] text-slate-500">Legacy Recruitment Filter</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-bold uppercase tracking-wider">
                  Result: Auto-Rejected
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Boolean Query
                  </span>
                  <code className="text-[11px] text-slate-700 font-mono">
                    "QA" AND ("Playwright" OR "Selenium") AND "CI/CD"
                  </code>
                </div>
                <div className="bg-red-50/70 rounded-xl p-3 border border-red-100">
                  <span className="text-[10px] font-mono uppercase text-red-500 block mb-1">
                    Screener Verdict
                  </span>
                  <p className="text-red-900 font-medium">
                    0/2 Target Frameworks Found. 14 years of domain logic ignored as non-matching.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* The Second Act Adjacency Model (The Solution) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-sap-500 shadow-elevated relative overflow-hidden flex-1 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-sap-100 text-sap-600 flex items-center justify-center font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Second Act Latent Adjacency Engine
                    </h4>
                    <p className="text-[11px] text-slate-500">SAP Hackfest Inclusive Architecture</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-sap-50 text-sap-700 border border-sap-200 text-[11px] font-bold uppercase tracking-wider">
                    72% Adjacency Ready
                  </span>
                </div>
              </div>

              <div className="my-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                  <span className="text-2xl font-bold text-ink-950 block">4</span>
                  <span className="text-xs font-semibold text-slate-700 block mt-0.5">Core Pillars</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Directly transferable without retraining.
                  </p>
                </div>

                <div className="bg-gapAmber-50/60 rounded-xl p-3.5 border border-gapAmber-200/70">
                  <span className="text-2xl font-bold text-gapAmber-800 block">2</span>
                  <span className="text-xs font-semibold text-gapAmber-900 block mt-0.5">Micro-Gaps</span>
                  <p className="text-[11px] text-gapAmber-700 mt-1">
                    Targeted syntax & workflow delta.
                  </p>
                </div>

                <div className="bg-sap-50/80 rounded-xl p-3.5 border border-sap-200/70">
                  <span className="text-2xl font-bold text-sap-700 block">3-4</span>
                  <span className="text-xs font-semibold text-sap-900 block mt-0.5">Weeks Bridge</span>
                  <p className="text-[11px] text-sap-600 mt-1">
                    Focused micro-learning roadmap.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Strategic Diagnosis
                  </span>
                  <span className="text-xs font-semibold text-white">
                    Not a career restart. An adjacent promotion.
                  </span>
                </div>
                <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                  Status: High Viability
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
