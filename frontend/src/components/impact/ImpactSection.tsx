import React from 'react';
import { motion } from 'framer-motion';
import { IMPACT_THEMES } from '../../data/mockData';
import { Users, Building2, Globe2, ArrowUpRight } from 'lucide-react';

export const ImpactSection: React.FC = () => {
  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'WORKER': return <Users className="w-5 h-5 text-sap-600" />;
      case 'EMPLOYER': return <Building2 className="w-5 h-5 text-sap-600" />;
      case 'ECONOMY': return <Globe2 className="w-5 h-5 text-sap-600" />;
      default: return <Users className="w-5 h-5 text-sap-600" />;
    }
  };

  return (
    <section id="impact" className="py-24 sm:py-32 relative bg-white border-t border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-sap-600" />
            <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-slate-700">
              The Broader Impact
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink-950 leading-tight">
            Restoring agency across <br />
            <span className="text-sap-600">every tier of the workforce.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            AI displacement doesn't have to trigger permanent structural unemployment.
            When we measure proximity rather than absolute obsolescence, everyone wins.
          </p>
        </div>

        {/* 3 Impact Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {IMPACT_THEMES.map((item, idx) => (
            <motion.div
              key={item.theme}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="bg-surface-subtle rounded-2xl p-7 sm:p-8 border border-slate-200/90 shadow-subtle flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                {/* Header Tag & Icon */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                      {getThemeIcon(item.theme)}
                    </div>
                    <span className="text-xs font-mono font-bold tracking-wider text-slate-500 uppercase">
                      {item.theme}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    {item.highlight}
                  </span>
                </div>

                {/* Main Headline */}
                <h3 className="text-xl font-bold text-ink-950 leading-snug mb-4">
                  {item.headline}
                </h3>

                {/* Subtext */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  {item.subtext}
                </p>
              </div>

              {/* Stat footer */}
              <div className="pt-6 border-t border-slate-200/80 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-extrabold text-ink-950 tracking-tight block">
                    {item.stat}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {item.statLabel}
                  </span>
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
