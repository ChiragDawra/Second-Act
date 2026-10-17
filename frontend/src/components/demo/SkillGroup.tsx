import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skill } from '../../types';
import { Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface SkillGroupProps {
  title: string;
  count: number;
  type: 'existing' | 'gap';
  skills: Skill[];
  onExploreLearning?: () => void;
}

export const SkillGroup: React.FC<SkillGroupProps> = ({
  title,
  count,
  type,
  skills,
  onExploreLearning,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const isExisting = type === 'existing';

  return (
    <div className="space-y-3">
      {/* Group Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isExisting ? 'bg-sap-600' : 'bg-gapAmber-500'
            }`}
          />
          <h4 className="text-sm font-bold text-ink-950">{title}</h4>
          <span
            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
              isExisting
                ? 'bg-sap-50 text-sap-700 border border-sap-200'
                : 'bg-gapAmber-50 text-gapAmber-800 border border-gapAmber-200'
            }`}
          >
            {count}
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          {isExisting ? 'Recognized Foundation' : 'Manageable Deltas'}
        </span>
      </div>

      {/* Cards List */}
      <div className="space-y-2.5">
        {skills.map((skill) => {
          const isExpanded = expandedId === skill.id;

          return (
            <div
              key={skill.id}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? isExisting
                    ? 'bg-white border-sap-400 shadow-elevated'
                    : 'bg-white border-gapAmber-400 shadow-elevated'
                  : 'bg-white/80 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {/* Card Summary Row */}
              <button
                type="button"
                onClick={() => toggleExpand(skill.id)}
                className="w-full text-left p-4 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sap-500 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isExisting
                        ? 'bg-sap-50 text-sap-600'
                        : 'bg-gapAmber-50 text-gapAmber-600'
                    }`}
                  >
                    {isExisting ? (
                      <Check className="w-4 h-4 text-sap-600" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-gapAmber-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-950">
                        {skill.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {skill.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {isExisting
                        ? `${skill.yearsOfExperience} yrs verified depth • ${skill.proficiency}% mastery`
                        : `Targeted bridge delta • ${skill.relevanceToTarget.slice(0, 48)}...`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
                      isExisting
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-gapAmber-100 text-gapAmber-800'
                    }`}
                  >
                    {isExisting ? 'Transfers 100%' : 'Bridge in 3 wks'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Card Expandable Deep-Dive */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-slate-100 px-4 pb-4 pt-3 text-xs bg-slate-50/50 rounded-b-xl space-y-3"
                  >
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                        Skill Context
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        {skill.description}
                      </p>
                    </div>

                    <div
                      className={`p-3 rounded-lg border ${
                        isExisting
                          ? 'bg-sap-50/60 border-sap-200 text-sap-900'
                          : 'bg-gapAmber-50/60 border-gapAmber-200 text-gapAmber-900'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider block font-semibold mb-0.5">
                        Why this matters to the target role
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        {skill.relevanceToTarget}
                      </p>
                    </div>

                    {!isExisting && onExploreLearning && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExploreLearning();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gapAmber-600 hover:bg-gapAmber-700 text-white font-semibold text-[11px] shadow-sm transition-all"
                        >
                          <span>Preview Learning Pathway for {skill.name}</span>
                          <Sparkles className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
