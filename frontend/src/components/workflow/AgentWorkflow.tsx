import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AGENT_STAGES } from '../../data/mockData';
import { DynamicIcon } from '../ui/DynamicIcon';
import { UserCheck, ArrowRight } from 'lucide-react';

export const AgentWorkflow: React.FC = () => {
  const [selectedStageId, setSelectedStageId] = useState<number>(1);
  const selectedStage = AGENT_STAGES.find((s) => s.id === selectedStageId) || AGENT_STAGES[0];

  return (
    <section id="how-it-works" className="py-24 sm:py-32 relative bg-surface-subtle border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sap-50 border border-sap-200/80 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-sap-600" />
            <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-sap-800">
              System Architecture
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink-950 leading-tight">
            Six specialised agents. <br />
            <span className="text-sap-600">One human always in charge.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Second Act doesn't rely on a single opaque LLM prompt. Six specialized agentic nodes collaborate across the recovery pipeline, with transparent decision gates and strict human verification at every step.
          </p>
        </div>

        {/* 6-Stage Timeline / Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 6 Stage Selector Buttons */}
          <div className="lg:col-span-5 space-y-2.5">
            {AGENT_STAGES.map((stage) => {
              const isSelected = stage.id === selectedStageId;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-white border-sap-500 shadow-elevated ring-1 ring-sap-500/30'
                      : 'bg-white/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-sap-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <DynamicIcon name={stage.iconName} className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          {stage.badge}
                        </span>
                        {stage.id === 6 && (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Ethical Core
                          </span>
                        )}
                      </div>
                      <h4
                        className={`text-sm font-bold ${
                          isSelected ? 'text-ink-950' : 'text-slate-800'
                        }`}
                      >
                        {stage.name}
                      </h4>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 transition-transform ${
                      isSelected
                        ? 'text-sap-600 translate-x-1'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Right Column: Deep-Dive Agent Card */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedStage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl p-7 sm:p-9 border border-slate-200/90 shadow-premium"
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-6 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-sap-50 border border-sap-200 text-sap-600 flex items-center justify-center">
                      <DynamicIcon name={selectedStage.iconName} className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-semibold text-sap-600 uppercase tracking-wider block">
                        {selectedStage.badge} Execution
                      </span>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-ink-950">
                        {selectedStage.name}
                      </h3>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Agent 0{selectedStage.id} of 06
                  </span>
                </div>

                {/* Tagline & Description */}
                <div className="space-y-4 mb-8">
                  <p className="text-base font-semibold text-slate-900">
                    {selectedStage.tagline}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {selectedStage.description}
                  </p>
                </div>

                {/* Simulated Output in Harpreet's Context */}
                <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200/80 mb-6">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sap-600" />
                    Simulated Output (Harpreet Singh Case)
                  </span>
                  <p className="text-xs sm:text-sm font-mono text-slate-800 bg-white p-3 rounded-lg border border-slate-200">
                    {selectedStage.actionOutput}
                  </p>
                </div>

                {/* Human-in-the-Loop Oversight Guarantee */}
                <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Human-in-the-Loop Safeguard
                    </h5>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      {selectedStage.humanOversightNote}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
