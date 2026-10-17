import React from 'react';
import { ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-900 py-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-sap-600 flex items-center justify-center text-white font-bold text-sm">
              II
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">
                Second Act
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                SAP Hackfest 2026 • Inclusive Workforce
              </span>
            </div>
          </div>

          <p className="max-w-md text-slate-400 text-[11px] leading-relaxed">
            Second Act is an agentic career-recovery system designed for workers displaced by AI. We believe that domain experience retains permanent value when connected through high-leverage skill adjacencies.
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 Second Act. Built with SAP design principles. Client-side prototype demonstration.
          </div>
          <div className="flex items-center gap-4">
            <span>Harpreet Singh Case Study</span>
            <span>•</span>
            <span>Local Frontend Architecture</span>
            <span>•</span>
            <span>Inclusive Workforce Category</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
