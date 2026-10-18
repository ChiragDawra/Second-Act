import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, GraduationCap, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentWorkflow } from '../components/workflow/AgentWorkflow';
import { MatchDemo } from '../components/demo/MatchDemo';
import { ClosingCTA } from '../components/footer/ClosingCTA';
import { Footer } from '../components/footer/Footer';
import { HeroSection } from '../components/hero/HeroSection';
import { ImpactSection } from '../components/impact/ImpactSection';
import { LearningPathway } from '../components/learning/LearningPathway';
import { Navbar } from '../components/nav/Navbar';
import { CareerBridgeSection } from '../components/story/CareerBridgeSection';
import { ProblemSection } from '../components/story/ProblemSection';
import { HARPREET_PROFILE } from '../data/mockData';
import type { CandidateProfile } from '../types';

const AUDIENCES = [
  {
    icon: UserRound,
    title: 'Job seekers',
    body: 'Upload your resume. We separate what you have done from what you plan to learn, show nearby roles with honest gaps, and let you prove a skill.',
    points: ['Evidence for every skill', 'Roles ranked by estimated fit', 'Free, always'],
  },
  {
    icon: GraduationCap,
    title: 'Mentors',
    body: 'Help someone make the move you already made. You see only the fields they approve, and they can withdraw at any time.',
    points: ['Requests matched to your skills', 'Private notes and shared feedback', 'Approved by our team'],
  },
  {
    icon: Briefcase,
    title: 'Recruiters',
    body: 'Meet candidates who chose to share with your organisation, with skill evidence instead of keyword guesses. Post your own openings.',
    points: ['Consent-first candidate list', 'Fit against your openings', 'Verified organisations only'],
  },
];

function AudienceSection({ onStart }: { onStart: () => void }) {
  return (
    <section id="who" className="py-24 bg-white border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] font-mono font-semibold tracking-wider uppercase text-sap-600">One platform, three ways in</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-950 mt-3">Sign in with Google and choose your side of the bridge.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {AUDIENCES.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="rounded-2xl border border-slate-200/80 bg-surface-subtle p-6 hover:shadow-premium transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl bg-sap-600 text-white flex items-center justify-center shadow-glow-sap">
                <a.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-ink-950 mt-5">{a.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{a.body}</p>
              <ul className="mt-5 space-y-2">
                {a.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-sap-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        <button
          type="button"
          onClick={onStart}
          className="mt-10 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-ink-950 hover:bg-ink-900 text-white font-semibold text-sm transition-all active:scale-[0.98] group"
        >
          Get started
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>
  );
}

export default function Landing() {
  const [profile, setProfile] = useState<CandidateProfile>(HARPREET_PROFILE);
  const navigate = useNavigate();
  const start = () => navigate('/login');

  const scrollToSection = (id: string) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(id);
    if (element) window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  };

  return (
    <div id="top" className="min-h-screen bg-[#FAFBFD] text-ink-950 font-sans selection:bg-sap-100 selection:text-sap-900">
      <Navbar onNavClick={scrollToSection} />
      <main>
        <HeroSection profile={profile} onStartClick={start} onExploreClick={() => scrollToSection('match-demo')} />
        <ProblemSection profile={profile} onJumpToBridge={() => scrollToSection('insight')} />
        <CareerBridgeSection profile={profile} />
        <AudienceSection onStart={start} />
        <AgentWorkflow />
        <MatchDemo currentProfile={profile} onSelectProfile={setProfile} onExploreLearningPathway={() => scrollToSection('learning-pathway')} />
        <LearningPathway profile={profile} />
        <ImpactSection />
        <ClosingCTA onStartClick={start} onExploreClick={() => scrollToSection('match-demo')} />
      </main>
      <Footer />
    </div>
  );
}
