import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
  onNavClick: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'The Problem', href: 'problem' },
    { label: 'The Insight', href: 'insight' },
    { label: 'How It Works', href: 'how-it-works' },
    { label: 'Sample Match', href: 'match-demo' },
    { label: 'Learning Bridge', href: 'learning-pathway' },
    { label: 'Impact', href: 'impact' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavClick(href);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/85 backdrop-blur-md border-b border-slate-200/70 shadow-subtle py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => handleLinkClick(e, 'top')}
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-sap-500 rounded-lg p-1"
          >
            <div className="w-8 h-8 rounded-lg bg-sap-600 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:bg-sap-700 transition-colors">
              II
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-ink-950 flex items-center gap-1.5 leading-none">
                Second Act
                <span className="text-[10px] font-mono font-medium text-sap-700 bg-sap-50 px-1.5 py-0.5 rounded border border-sap-200">
                  SAP '26
                </span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wide mt-0.5">
                Inclusive Workforce
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={`#${link.href}`}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="text-xs font-medium text-slate-600 hover:text-ink-950 transition-colors py-1 focus:outline-none focus:ring-2 focus:ring-sap-500 rounded"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Demonstration Action CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavClick('match-demo')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink-950 hover:bg-ink-900 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sap-500"
            >
              <span>Explore Harpreet’s Match</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sap-500"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 pt-3 pb-6 shadow-xl space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={`#${link.href}`}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavClick('match-demo');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sap-600 text-white text-sm font-semibold shadow-sm"
            >
              <span>Explore Harpreet’s Match</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
