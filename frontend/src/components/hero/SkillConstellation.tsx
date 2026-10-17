import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchRing } from '../ui/MatchRing';
import { CandidateProfile } from '../../types';
import { Check, Sparkles, ArrowRight } from 'lucide-react';

interface SkillConstellationProps {
  profile: CandidateProfile;
}

export const SkillConstellation: React.FC<SkillConstellationProps> = ({ profile }) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  // Transferable skills (4)
  const existingSkills = profile.existingSkills;
  // Missing skills (2)
  const skillGaps = profile.skillGaps;

  return (
    <div className="relative w-full max-w-xl mx-auto select-none">
      {/* Ambient background glow */}
      <div className="absolute -top-10 -right-10 w-72 h-72 bg-sap-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-gapAmber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-premium p-6 sm:p-7"
      >
        {/* Candidate Identity Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-slate-500">
                Sample Demonstration • Profile #{profile.id.slice(0, 8)}
              </span>
            </div>
            <h3 className="text-xl font-bold text-ink-950 flex items-center gap-2">
              {profile.name}
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {profile.age} yrs • {profile.location}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {profile.experienceYears} Years Manual Experience • {profile.domainSpecialization}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Match Confidence
            </span>
            <span className="text-sm font-semibold text-sap-600">
              Verified Adjacency
            </span>
          </div>
        </div>

        {/* Constellation SVG Diagram Container */}
        <div className="relative h-[360px] sm:h-[380px] w-full flex items-center justify-center">
          {/* SVG Connecting Curves */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 540 380">
            <defs>
              <linearGradient id="lineExisting" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#0064D9" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0064D9" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="lineGap" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0064D9" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Connecting lines from Source to Transferable Skills */}
            <motion.path
              d="M 80 190 C 100 130, 110 70, 160 50"
              fill="transparent"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.4 }}
            />
            <motion.path
              d="M 80 190 C 100 150, 105 120, 140 120"
              fill="transparent"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.5 }}
            />
            <motion.path
              d="M 80 190 C 100 230, 105 260, 140 260"
              fill="transparent"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.6 }}
            />
            <motion.path
              d="M 80 190 C 100 250, 110 310, 160 330"
              fill="transparent"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.7 }}
            />

            {/* Bridge lines through center ring to target */}
            <motion.path
              d="M 230 50 C 270 50, 360 120, 440 190"
              fill="transparent"
              stroke="url(#lineExisting)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.8 }}
            />
            <motion.path
              d="M 230 330 C 270 330, 360 260, 440 190"
              fill="transparent"
              stroke="url(#lineExisting)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.9 }}
            />

            {/* Amber Gap Bridge Lines from missing skills to target */}
            <motion.path
              d="M 390 70 C 420 100, 435 140, 440 190"
              fill="transparent"
              stroke="url(#lineGap)"
              strokeWidth="2"
              strokeDasharray="3 3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 1.0 }}
            />
            <motion.path
              d="M 390 310 C 420 280, 435 240, 440 190"
              fill="transparent"
              stroke="url(#lineGap)"
              strokeWidth="2"
              strokeDasharray="3 3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 1.1 }}
            />
          </svg>

          {/* Source Node (Left) */}
          <div className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="px-3 py-2 bg-slate-900 text-white rounded-lg shadow-elevated border border-slate-700 text-left max-w-[115px]"
            >
              <span className="text-[9px] font-mono tracking-wider uppercase text-slate-400 block">
                Current Role
              </span>
              <span className="text-xs font-semibold leading-tight block">
                {profile.currentRole}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {profile.experienceYears} yrs verified
              </span>
            </motion.div>
          </div>

          {/* Center Match Ring Indicator */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <MatchRing
              score={profile.matchScore}
              size="md"
              showLabel={false}
              animated={true}
            />
          </div>

          {/* Transferable Skill Nodes - Cleanly Spaced */}
          {/* Skill 1: Test-Case Design */}
          <div className="absolute left-[20%] top-[4%] z-10">
            <motion.button
              type="button"
              onMouseEnter={() => setActiveNode(existingSkills[0].name)}
              onMouseLeave={() => setActiveNode(null)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                activeNode === existingSkills[0].name
                  ? 'bg-sap-50 border-sap-500 text-sap-800 shadow-md scale-105'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-sap-300'
              }`}
            >
              <Check className="w-3 h-3 text-sap-600" />
              <span>{existingSkills[0].name}</span>
            </motion.button>
          </div>

          {/* Skill 2: Defect Triage */}
          <div className="absolute left-[17%] top-[25%] z-10">
            <motion.button
              type="button"
              onMouseEnter={() => setActiveNode(existingSkills[1].name)}
              onMouseLeave={() => setActiveNode(null)}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                activeNode === existingSkills[1].name
                  ? 'bg-sap-50 border-sap-500 text-sap-800 shadow-md scale-105'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-sap-300'
              }`}
            >
              <Check className="w-3 h-3 text-sap-600" />
              <span>{existingSkills[1].name}</span>
            </motion.button>
          </div>

          {/* Skill 3: Banking Domain */}
          <div className="absolute left-[17%] bottom-[25%] z-10">
            <motion.button
              type="button"
              onMouseEnter={() => setActiveNode(existingSkills[2].name)}
              onMouseLeave={() => setActiveNode(null)}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                activeNode === existingSkills[2].name
                  ? 'bg-sap-50 border-sap-500 text-sap-800 shadow-md scale-105'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-sap-300'
              }`}
            >
              <Check className="w-3 h-3 text-sap-600" />
              <span>Banking Domain</span>
            </motion.button>
          </div>

          {/* Skill 4: Requirement Analysis */}
          <div className="absolute left-[20%] bottom-[4%] z-10">
            <motion.button
              type="button"
              onMouseEnter={() => setActiveNode(existingSkills[3].name)}
              onMouseLeave={() => setActiveNode(null)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                activeNode === existingSkills[3].name
                  ? 'bg-sap-50 border-sap-500 text-sap-800 shadow-md scale-105'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-sap-300'
              }`}
            >
              <Check className="w-3 h-3 text-sap-600" />
              <span>Requirement Analysis</span>
            </motion.button>
          </div>

          {/* Missing Skill 1 (Amber Highlight): Automation-Tool Scripting */}
          <div className="absolute right-[12%] top-[8%] z-10">
            <motion.button
              type="button"
              onMouseEnter={() => setActiveNode(skillGaps[0].name)}
              onMouseLeave={() => setActiveNode(null)}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 transition-all shadow-subtle ${
                activeNode === skillGaps[0].name
                  ? 'bg-gapAmber-100 border-gapAmber-600 text-gapAmber-900 shadow-glow-amber scale-105'
                  : 'bg-gapAmber-50/90 border-gapAmber-300 text-gapAmber-800 hover:border-gapAmber-500'
              }`}
            >
              <Sparkles className="w-3 h-3 text-gapAmber-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Gap: Scripting</span>
            </motion.button>
          </div>

          {/* Missing Skill 2 (Amber Highlight): CI/CD Fundamentals */}
          <div className="absolute right-[12%] bottom-[8%] z-10">
            <motion.button
              type="button"
              onMouseEnter={() => setActiveNode(skillGaps[1].name)}
              onMouseLeave={() => setActiveNode(null)}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 transition-all shadow-subtle ${
                activeNode === skillGaps[1].name
                  ? 'bg-gapAmber-100 border-gapAmber-600 text-gapAmber-900 shadow-glow-amber scale-105'
                  : 'bg-gapAmber-50/90 border-gapAmber-300 text-gapAmber-800 hover:border-gapAmber-500'
              }`}
            >
              <Sparkles className="w-3 h-3 text-gapAmber-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Gap: CI/CD Pipelines</span>
            </motion.button>
          </div>

          {/* Target Role Node (Right) */}
          <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="px-3.5 py-2.5 bg-sap-600 text-white rounded-lg shadow-glow-sap border border-sap-400 text-left max-w-[130px]"
            >
              <span className="text-[9px] font-mono tracking-wider uppercase text-sap-200 block">
                Target Role
              </span>
              <span className="text-xs font-semibold leading-tight block">
                {profile.targetRole}
              </span>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-sap-100 font-medium">
                <span>+42% Growth</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Dynamic Detail Tooltip Footer */}
        <div className="border-t border-slate-100 pt-3 mt-1 min-h-[46px] flex items-center justify-between text-xs text-slate-600">
          <AnimatePresence mode="wait">
            {activeNode ? (
              <motion.div
                key={activeNode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className="font-semibold text-ink-950">{activeNode}:</span>
                <span className="text-slate-600">
                  {existingSkills.find(s => s.name.includes(activeNode))?.relevanceToTarget ||
                   skillGaps.find(g => activeNode.includes('Scripting') ? g.id === 'gap-1' : g.id === 'gap-2')?.relevanceToTarget ||
                   'Direct adjacent bridge skill essential for target role readiness.'}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between w-full text-slate-500"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-sap-500" />
                  <span>4 Transferable Competencies</span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-gapAmber-500" />
                  <span>2 Micro-Gaps to Bridge</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Hover nodes to explore
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
