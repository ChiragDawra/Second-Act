import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CandidateProfile, LearningStep } from '../../types';
import { MatchRing } from '../ui/MatchRing';
import {
  Check,
  Clock,
  Award,
  RotateCcw,
  Info
} from 'lucide-react';

interface LearningPathwayProps {
  profile: CandidateProfile;
}

export const LearningPathway: React.FC<LearningPathwayProps> = ({ profile }) => {
  // Local state for completed steps
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const resetProgress = () => {
    setCompletedSteps({});
  };

  // Calculate dynamic match score bump
  const allSteps: LearningStep[] = profile.learningModules.flatMap((m) => m.steps);
  const totalSteps = allSteps.length;
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressRatio = totalSteps > 0 ? completedCount / totalSteps : 0;

  // Base score 72%, scales up to 100%
  const currentCalculatedScore = Math.min(
    100,
    Math.round(profile.matchScore + progressRatio * (100 - profile.matchScore))
  );

  return (
    <section id="learning-pathway" className="py-24 sm:py-32 relative bg-surface-subtle border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gapAmber-50 border border-gapAmber-200/80 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-gapAmber-600" />
            <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-gapAmber-900">
              Targeted Bridge Curriculum
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink-950 leading-tight">
            Not another career from scratch. <br />
            <span className="text-sap-600">A bridge to the next one.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Forget 12-month generic bootcamps that force you to re-learn what you already know.
            Second Act synthesizes micro-exercises that leverage your 14 years of testing instincts to master only the syntax delta.
          </p>
        </div>

        {/* Live Progress Bar & Score Simulator */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-elevated mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Upskilling Readiness Simulator
              </span>
              <h3 className="text-lg font-bold text-ink-950 flex items-center gap-2">
                <span>Interactive Learning Progress:</span>
                <span className="text-sap-600 font-extrabold">{completedCount} of {totalSteps} modules verified</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Click “Mark as Completed” below to simulate Harpreet closing his two skill gaps.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Projected Readiness
                </span>
                <span className="text-2xl font-black text-ink-950">
                  {currentCalculatedScore}%
                </span>
              </div>
              <MatchRing score={currentCalculatedScore} size="sm" showLabel={false} animated={false} />
            </div>
          </div>

          {/* Progress track */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-sap-600 via-sky-500 to-emerald-500 h-full rounded-full"
                animate={{ width: `${(completedCount / totalSteps) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            {completedCount > 0 && (
              <button
                type="button"
                onClick={resetProgress}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {currentCalculatedScore === 100 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2"
            >
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>100% Transition Ready!</strong> Harpreet Singh is now fully qualified for the QA Automation Engineer enterprise pipeline.
              </span>
            </motion.div>
          )}
        </div>

        {/* The Two Skill Bridge Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {profile.learningModules.map((module, mIdx) => (
            <div
              key={module.id}
              className="bg-white rounded-2xl p-7 sm:p-8 border border-slate-200/90 shadow-subtle flex flex-col justify-between"
            >
              <div>
                {/* Module Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-gapAmber-100 text-gapAmber-800 font-mono font-bold text-xs flex items-center justify-center">
                      0{mIdx + 1}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Micro-Bridge Module
                      </span>
                      <h4 className="text-base font-extrabold text-ink-950">
                        {module.skillName}
                      </h4>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {module.bridgeTimeframe}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  {module.whyItMatters}
                </p>

                {/* Steps List */}
                <div className="space-y-4">
                  {module.steps.map((step) => {
                    const isDone = Boolean(completedSteps[step.id]);

                    return (
                      <div
                        key={step.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isDone
                            ? 'bg-emerald-50/60 border-emerald-300'
                            : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                isDone
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isDone ? <Check className="w-3 h-3" /> : step.stepNumber}
                            </span>
                            <div>
                              <h5
                                className={`text-xs font-bold leading-tight ${
                                  isDone ? 'text-emerald-950 line-through' : 'text-ink-950'
                                }`}
                              >
                                {step.title}
                              </h5>
                              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                {step.description}
                              </p>
                              <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-2">
                                <span className="font-semibold text-sap-700 bg-sap-50 px-1.5 py-0.5 rounded border border-sap-200">
                                  Leverages: {step.leveragesExistingSkill}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {step.estimatedTime}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleStep(step.id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shrink-0 ${
                              isDone
                                ? 'bg-emerald-200/70 text-emerald-900 hover:bg-emerald-300'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {isDone ? 'Completed' : 'Mark Done'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sample note */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400">
                <Info className="w-3 h-3" />
                <span>Curated micro-curriculum prototype for SAP Hackfest demonstration.</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
