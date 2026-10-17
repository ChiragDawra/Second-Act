import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CandidateProfile } from '../../types';
import { ALTERNATE_PROFILES } from '../../data/mockData';
import { MatchRing } from '../ui/MatchRing';
import { SkillGroup } from './SkillGroup';
import {
  Sparkles,
  Info,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MatchDemoProps {
  currentProfile: CandidateProfile;
  onSelectProfile: (profile: CandidateProfile) => void;
  onExploreLearningPathway: () => void;
}

export const MatchDemo: React.FC<MatchDemoProps> = ({
  currentProfile,
  onSelectProfile,
  onExploreLearningPathway,
}) => {
  const [filter, setFilter] = useState<'all' | 'existing' | 'gap'>('all');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const resetFilters = () => {
    setFilter('all');
  };

  return (
    <section id="match-demo" className="py-24 sm:py-32 relative bg-white border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sap-50 border border-sap-200/80 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-sap-600" />
              <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-sap-800">
                Interactive Demonstration
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink-950">
              Meet your next role.
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600">
              Your experience is the starting point. See what transfers—and what comes next.
            </p>
          </div>

          {/* Persona Switcher for Hackathon Demonstration */}
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 flex items-center gap-1 self-start md:self-auto">
            <span className="text-[10px] font-mono uppercase text-slate-400 px-2">
              Profile:
            </span>
            {ALTERNATE_PROFILES.map((p) => {
              const active = p.id === currentProfile.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProfile(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white text-ink-950 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p.name.split(' ')[0]} ({p.matchScore}%)
                </button>
              );
            })}
          </div>
        </div>

        {/* Prototype Disclaimer Banner */}
        <div className="mb-8 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sap-600 shrink-0" />
            <span>
              <strong>Sample Demonstration:</strong> Interactive client prototype modeled on real-world worker data. No live AI inference or external APIs required.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="text-sap-600 font-semibold hover:text-sap-700 flex items-center gap-1 shrink-0 ml-4"
          >
            <span>How this match works</span>
            {showHowItWorks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* "How This Match Works" Collapsible Drawer */}
        <AnimatePresence>
          {showHowItWorks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-8 bg-sap-50/50 rounded-2xl border border-sap-200/70 p-6 sm:p-8"
            >
              <h4 className="text-sm font-bold text-sap-950 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sap-600" />
                Three-Pillar Adjacency Methodology
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-700">
                <div className="bg-white p-4 rounded-xl border border-sap-100 shadow-subtle">
                  <span className="w-6 h-6 rounded-full bg-sap-100 text-sap-700 font-mono font-bold flex items-center justify-center mb-2">1</span>
                  <h5 className="font-bold text-ink-950 mb-1">Decomposes Functional Experience</h5>
                  <p className="text-slate-600 leading-relaxed">
                    Breaks the current role into granular, domain-specific competencies (e.g. boundary value testing, ledger reconciliation) rather than titles.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-sap-100 shadow-subtle">
                  <span className="w-6 h-6 rounded-full bg-sap-100 text-sap-700 font-mono font-bold flex items-center justify-center mb-2">2</span>
                  <h5 className="font-bold text-ink-950 mb-1">Maps Graph Topological Proximity</h5>
                  <p className="text-slate-600 leading-relaxed">
                    Searches live enterprise market clusters for growing adjacent roles where 70%+ of competencies overlap directly.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-sap-100 shadow-subtle">
                  <span className="w-6 h-6 rounded-full bg-sap-100 text-sap-700 font-mono font-bold flex items-center justify-center mb-2">3</span>
                  <h5 className="font-bold text-ink-950 mb-1">Quantifies Learnability Delta</h5>
                  <p className="text-slate-600 leading-relaxed">
                    Calculates distance based on learnability speed (2–4 weeks) rather than raw keyword absence, eliminating misleading rejection.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Demonstration Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Candidate & Target Summary Card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Candidate Role Card */}
            <div className="bg-surface-subtle rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-subtle">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {currentProfile.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink-950">
                      {currentProfile.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {currentProfile.age} yrs • {currentProfile.location}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-medium text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                  {currentProfile.experienceYears} yrs tenure
                </span>
              </div>

              {/* Roles Comparison Box */}
              <div className="my-5 space-y-4">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Source Experience
                  </span>
                  <span className="text-sm font-bold text-slate-800 block mt-0.5">
                    {currentProfile.currentRole}
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Domain: {currentProfile.domainSpecialization}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-sap-50 border border-sap-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-sap-600 font-semibold block">
                      Target Adjacent Role
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      +42% Growth
                    </span>
                  </div>
                  <span className="text-base font-extrabold text-sap-900 block mt-0.5">
                    {currentProfile.targetRole}
                  </span>
                  <span className="text-xs text-sap-700 block mt-0.5">
                    Benchmarked compensation: {currentProfile.salaryTrajectory.targetAvg} (vs {currentProfile.salaryTrajectory.currentAvg} current)
                  </span>
                </div>
              </div>

              {/* Match Ring Summary */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-ink-950 block">
                    Structural Adjacency Score
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-[180px]">
                    {currentProfile.existingSkills.length} competencies fully transferred • {currentProfile.skillGaps.length} manageable delta skills
                  </p>
                </div>
                <MatchRing score={currentProfile.matchScore} size="sm" showLabel={false} />
              </div>

              {/* Primary action to move to Section 5 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onExploreLearningPathway}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sap-600 hover:bg-sap-700 text-white font-semibold text-xs shadow-sm hover:shadow-glow-sap transition-all active:scale-[0.98]"
                >
                  <span>Explore this career pathway</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Skills Matrix */}
          <div className="lg:col-span-7 space-y-6">
            {/* Filter Toolbar & Reset */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Filter:</span>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      filter === 'all'
                        ? 'bg-white text-ink-950 shadow-sm'
                        : 'text-slate-600 hover:text-ink-950'
                    }`}
                  >
                    All Skills ({currentProfile.existingSkills.length + currentProfile.skillGaps.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('existing')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      filter === 'existing'
                        ? 'bg-white text-sap-700 shadow-sm'
                        : 'text-slate-600 hover:text-ink-950'
                    }`}
                  >
                    Skills I Have ({currentProfile.existingSkills.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('gap')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      filter === 'gap'
                        ? 'bg-white text-gapAmber-800 shadow-sm'
                        : 'text-slate-600 hover:text-ink-950'
                    }`}
                  >
                    Skills to Learn ({currentProfile.skillGaps.length})
                  </button>
                </div>
              </div>

              {filter !== 'all' && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset view</span>
                </button>
              )}
            </div>

            {/* Existing Skills (Transferable) */}
            {(filter === 'all' || filter === 'existing') && (
              <SkillGroup
                title="Transferable Competencies"
                count={currentProfile.existingSkills.length}
                type="existing"
                skills={currentProfile.existingSkills}
              />
            )}

            {/* Skill Gaps (The 2 Micro-Gaps) */}
            {(filter === 'all' || filter === 'gap') && (
              <SkillGroup
                title="Identified Skill Micro-Gaps"
                count={currentProfile.skillGaps.length}
                type="gap"
                skills={currentProfile.skillGaps}
                onExploreLearning={onExploreLearningPathway}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
