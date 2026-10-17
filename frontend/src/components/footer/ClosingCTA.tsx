import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface ClosingCTAProps {
  onExploreClick: () => void;
  onHowItWorksClick: () => void;
}

export const ClosingCTA: React.FC<ClosingCTAProps> = ({
  onExploreClick,
  onHowItWorksClick,
}) => {
  return (
    <section className="py-24 sm:py-32 relative bg-ink-950 text-white overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-sap-600/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sap-400" />
            <span className="text-[11px] font-mono font-semibold tracking-wider uppercase text-slate-300">
              SAP Hackfest 2026 • Inclusive Workforce
            </span>
          </div>

          {/* Headlines */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Your next chapter starts with <br />
            <span className="text-sap-400">what you already know.</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Find the nearest role, not the hardest restart. Second Act bridges experienced talent directly into the AI era.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onExploreClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-sap-600 hover:bg-sap-700 text-white font-semibold text-sm shadow-glow-sap transition-all active:scale-[0.98] group"
            >
              <span>Explore the example match</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={onHowItWorksClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-medium text-sm transition-all active:scale-[0.98]"
            >
              <span>Review Agent Pipeline</span>
            </button>
          </div>

          {/* Small reassurance note */}
          <div className="mt-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Candidate Data Privacy & Algorithmic Parity Guaranteed</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
