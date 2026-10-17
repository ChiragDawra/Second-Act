import React, { useState } from 'react';
import { HARPREET_PROFILE } from './data/mockData';
import { CandidateProfile } from './types';
import { Navbar } from './components/nav/Navbar';
import { HeroSection } from './components/hero/HeroSection';
import { ProblemSection } from './components/story/ProblemSection';
import { CareerBridgeSection } from './components/story/CareerBridgeSection';
import { AgentWorkflow } from './components/workflow/AgentWorkflow';
import { MatchDemo } from './components/demo/MatchDemo';
import { LearningPathway } from './components/learning/LearningPathway';
import { ImpactSection } from './components/impact/ImpactSection';
import { ClosingCTA } from './components/footer/ClosingCTA';
import { Footer } from './components/footer/Footer';

export const App: React.FC = () => {
  const [profile, setProfile] = useState<CandidateProfile>(HARPREET_PROFILE);

  const scrollToSection = (id: string) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div id="top" className="min-h-screen bg-[#FAFBFD] text-ink-950 font-sans selection:bg-sap-100 selection:text-sap-900">
      {/* Navigation */}
      <Navbar onNavClick={scrollToSection} />

      {/* Hero Section */}
      <main>
        <HeroSection
          profile={profile}
          onExploreClick={() => scrollToSection('match-demo')}
          onHowItWorksClick={() => scrollToSection('how-it-works')}
        />

        {/* Section 1: The Problem */}
        <ProblemSection
          profile={profile}
          onJumpToBridge={() => scrollToSection('insight')}
        />

        {/* Section 2: Core Insight (Signature Bridge) */}
        <CareerBridgeSection profile={profile} />

        {/* Section 3: How It Works (6 Agents Architecture) */}
        <AgentWorkflow />

        {/* Section 4: Interactive Adjacency Demonstration */}
        <MatchDemo
          currentProfile={profile}
          onSelectProfile={setProfile}
          onExploreLearningPathway={() => scrollToSection('learning-pathway')}
        />

        {/* Section 5: Manageable Learning Pathway */}
        <LearningPathway profile={profile} />

        {/* Section 6: Broader Impact */}
        <ImpactSection />

        {/* Section 7: Closing CTA */}
        <ClosingCTA
          onExploreClick={() => scrollToSection('match-demo')}
          onHowItWorksClick={() => scrollToSection('how-it-works')}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;
