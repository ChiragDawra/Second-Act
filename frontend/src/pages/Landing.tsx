import { useAuth } from '../auth/AuthProvider';
import { Hero } from '../components/landing/Hero';
import { Nav } from '../components/landing/Nav';
import { Audiences, Closing, Faq, Footer, HowItWorks, LiveDemo, Principles, SectorStrip } from '../components/landing/Sections';

export default function Landing() {
  const { session } = useAuth();
  const signedIn = Boolean(session);
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <Nav signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <SectorStrip />
        <HowItWorks />
        <LiveDemo />
        <Principles />
        <Audiences signedIn={signedIn} />
        <Faq />
        <Closing signedIn={signedIn} />
      </main>
      <Footer />
    </div>
  );
}
