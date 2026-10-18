import { motion } from 'framer-motion';
import { ArrowRight, BookOpenCheck, Briefcase, CircleHelp, GraduationCap, Plus, UserRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge, cn, FitDial, FitTrack, LinkButton, ReadinessBadge, Tabs, Wordmark } from '../../ui/kit';
import { PERSONAS } from './personas';
import { ResumeReader } from './ResumeReader';

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, delay }} className={className}>
      {children}
    </motion.div>
  );
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: ReactNode; body?: ReactNode }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="eyebrow text-accent">{eyebrow}</p>
      <h2 className="headline text-4xl sm:text-[3.4rem] mt-4">{title}</h2>
      {body ? <p className="text-fg-muted mt-5 leading-relaxed">{body}</p> : null}
    </Reveal>
  );
}

// -------------------------------------------------------------------------- sectors
export function SectorStrip() {
  const sectors = ['QA & software testing', 'Banking operations & BA', 'Customer & IT support', 'Data & reporting'];
  return (
    <section className="border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-center gap-5 justify-between">
        <p className="text-sm text-fg-muted">
          <span className="font-display text-2xl text-fg mr-2">17</span> pilot roles across four Delhi-NCR sectors
        </p>
        <div className="flex flex-wrap gap-2">
          {sectors.map((s) => (
            <span key={s} className="h-8 px-3.5 inline-flex items-center rounded-full border border-line text-xs text-fg-muted">
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------- how it works
const ACTS = [
  { numeral: 'I', title: 'Read', body: 'Upload a PDF or Word file, or paste text. It is read in memory and never stored.' },
  { numeral: 'II', title: 'Separate', body: 'What you have done, what you studied and what you plan to learn are kept apart. A goal never becomes a skill.' },
  { numeral: 'III', title: 'Match', body: 'Your confirmed skills are compared with every pilot role. You see an estimated fit — never a hiring probability — and why.' },
  { numeral: 'IV', title: 'Bridge', body: 'A plan per role: what to learn or prove, in what order, and roughly how many hours at your pace.' },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-24 sm:py-32 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHead eyebrow="How it works" title={<>Four acts, <em>one afternoon.</em></>} body="No questionnaire, no personality test. Your own work history, read carefully, is enough to start." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-14">
          {ACTS.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-line bg-surface p-6 hover:border-line-strong transition-colors">
                <p className="font-display text-5xl text-accent leading-none">{a.numeral}</p>
                <p className="font-semibold text-fg mt-6">{a.title}</p>
                <p className="text-sm text-fg-subtle mt-2 leading-relaxed">{a.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------- live demo
const STEP_ICON = { learn: BookOpenCheck, learn_or_confirm: CircleHelp, prove: GraduationCap } as const;

export function LiveDemo() {
  const [id, setId] = useState<string>(PERSONAS[0].id);
  const p = PERSONAS.find((x) => x.id === id) ?? PERSONAS[0];
  return (
    <section id="demo" className="py-24 sm:py-32 border-y border-line bg-surface/40 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <SectionHead
            eyebrow="See it work"
            title={<>Three resumes, <em>read for real.</em></>}
            body="This is the actual output of our extractor and matching engine on three short sample resumes. Pick one."
          />
          <Tabs value={id} onChange={setId} items={PERSONAS.map((x) => ({ value: x.id, label: x.name }))} />
        </div>

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 mt-12 items-start">
          <div>
            <ResumeReader key={p.id} persona={p} legend />
            <p className="text-xs text-fg-subtle mt-4 leading-relaxed">
              Highlighted phrases are what the extractor matched. Colour shows what the sentence says: done, studied, planned, or not yet. Only “done” can become a skill — and only after {p.name} confirms it.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-fg-muted">
              Starting point: <span className="text-fg">{p.from ?? 'not detected'}</span>
              {p.years ? <span> · about {Math.round(p.years)} years</span> : null}
            </p>
            {p.roles.map((r, i) => (
              <motion.div
                key={`${p.id}-${r.title}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn('rounded-2xl border p-5', i === 0 ? 'border-accent/35 bg-surface-2 shadow-glow' : 'border-line bg-surface')}
              >
                <div className="flex items-start gap-4">
                  <FitDial score={r.fit} size={56} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-fg">{r.title}</p>
                      {r.transition ? <Badge tone="accent">Known path</Badge> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ReadinessBadge status={r.readiness as 'ready' | 'needs_validation' | 'blocked'} />
                      <span className="text-[11px] text-fg-subtle">
                        {r.hours}h plan · fit {Math.round(r.fit ?? 0)} → {Math.round(r.after ?? 0)}
                      </span>
                    </div>
                    <FitTrack now={r.fit} after={r.after} className="mt-3" />
                    <ul className="mt-4 space-y-1.5">
                      {r.steps.map((s) => {
                        const kind = s.kind as keyof typeof STEP_ICON;
                        const Icon = STEP_ICON[kind];
                        return (
                          <li key={s.name} className="flex items-center gap-2 text-xs text-fg-muted">
                            <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
                            {kind === 'prove' ? 'Prove' : kind === 'learn' ? 'Learn' : 'Confirm or learn'} {s.name}
                            {kind !== 'prove' ? <span className="text-fg-subtle">· {s.hours}h</span> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
            {p.studyNext.length > 0 ? (
              <div className="rounded-2xl border border-line bg-surface p-5">
                <p className="eyebrow">Study next — most roles moved per hour</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.studyNext.map((s) => (
                    <Badge key={s.name} tone="grey">
                      {s.name} <span className="text-accent">+{s.gain}</span> <span className="text-fg-subtle">· {s.hours}h</span>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-[11px] text-fg-subtle">Estimated skill fit against team-drafted pilot roles. Not a hiring probability, not a vacancy.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------ principles
const PRINCIPLES = [
  { title: 'Evidence, not guesses', body: 'Every skill points at the sentence it came from. If we cannot quote you, we do not claim it.' },
  { title: 'Goals are not skills', body: '“Planning to learn Python” stays a goal. A course is exposure. Only what you have done counts — and you confirm it.' },
  { title: 'Fit, not odds', body: 'We estimate how much of a role you already cover. We never pretend to know your chance of being hired.' },
  { title: 'Your story, your call', body: 'Mentors and recruiters see only the fields you approve, for as long as you allow. Withdraw any time.' },
];

export function Principles() {
  return (
    <section id="principles" className="py-24 sm:py-32 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHead eyebrow="Principles" title={<>Honest by <em>design.</em></>} body="Career tools love confident numbers. We would rather show you exactly what we know, and say plainly what we do not." />
        <div className="grid md:grid-cols-2 gap-px bg-line rounded-3xl overflow-hidden border border-line mt-14">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06} className="bg-canvas">
              <div className="p-8 sm:p-10 h-full">
                <p className="font-mono text-xs text-accent">0{i + 1}</p>
                <p className="font-display text-3xl text-fg mt-4">{p.title}</p>
                <p className="text-sm text-fg-muted mt-3 leading-relaxed max-w-md">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------- audiences
const AUDIENCES = [
  {
    icon: UserRound,
    title: 'Job seekers',
    body: 'Upload your resume, confirm what is true, and see the roles you are closest to — with a plan for each.',
    points: ['Free, always', 'Prove a skill in ten minutes', 'Nothing shared without you'],
  },
  {
    icon: GraduationCap,
    title: 'Mentors',
    body: 'Help someone make the move you already made. You see only what they approve, and they can withdraw at any time.',
    points: ['Requests matched to your skills', 'Private notes and shared feedback', 'Approved by our team'],
  },
  {
    icon: Briefcase,
    title: 'Recruiters',
    body: 'Meet candidates who chose to share with your organisation, with evidence for every skill instead of keyword guesses.',
    points: ['Consent-first candidate list', 'Fit against your own openings', 'Verified organisations only'],
  },
];

export function Audiences({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="who" className="py-24 sm:py-32 border-y border-line bg-surface/40 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHead eyebrow="Who it’s for" title={<>One stage, <em>three ways in.</em></>} body="Sign in with Google and choose your side of the bridge. Mentor and recruiter accounts are checked by a person first." />
        <div className="grid md:grid-cols-3 gap-4 mt-14">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-line bg-canvas p-7 flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/25 text-accent flex items-center justify-center">
                  <a.icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <p className="font-display text-3xl text-fg mt-6">{a.title}</p>
                <p className="text-sm text-fg-muted mt-3 leading-relaxed flex-1">{a.body}</p>
                <ul className="mt-6 space-y-2 border-t border-line pt-5">
                  {a.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-xs text-fg-muted">
                      <span className="w-1 h-1 rounded-full bg-accent" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10">
          <LinkButton to={signedIn ? '/app' : '/login'} size="lg" kind="contrast" icon={<ArrowRight className="w-4 h-4" />}>
            {signedIn ? 'Open my dashboard' : 'Get started'}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------- faq
const FAQ = [
  { q: 'Is it free?', a: 'Yes, for job seekers, always. Mentors volunteer. Recruiters from verified organisations see only candidates who chose to share with them.' },
  { q: 'Do you keep my resume?', a: 'No. The file is read in memory to suggest skills and then discarded. Only the skills you confirm — with the sentence they came from — are saved to your profile.' },
  { q: 'Is this AI?', a: 'The resume reader is a set of published rules, not a language model, so you can see exactly why a skill was suggested. Matching is a deterministic formula with every factor shown.' },
  { q: 'What does “estimated fit” mean?', a: 'How much of a role’s requirements your confirmed skills cover, weighted by importance and by how strong the evidence is. It is not a hiring probability and it is not a vacancy.' },
  { q: 'Which roles and places are covered?', a: 'The pilot covers 17 roles in QA & testing, banking operations & business analysis, customer & IT support, and data & reporting, across Delhi, Gurugram, Noida, Ghaziabad and Faridabad. Role requirements are team-drafted and not yet expert-reviewed.' },
  { q: 'Who can see my profile?', a: 'Nobody, until you approve a specific mentor or recruiter organisation and the exact fields they may see. You can withdraw any time, and every view is logged for you.' },
];

export function Faq() {
  return (
    <section id="faq" className="py-24 sm:py-32 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1fr_1.4fr] gap-12">
        <SectionHead eyebrow="Questions" title={<>Asked <em>often.</em></>} />
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex items-center justify-between gap-6 cursor-pointer list-none">
                <span className="text-fg font-medium">{f.q}</span>
                <Plus className="w-4 h-4 text-fg-subtle transition-transform group-open:rotate-45 shrink-0" />
              </summary>
              <p className="text-sm text-fg-muted mt-3 leading-relaxed max-w-2xl">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------- close + foot
export function Closing({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36 border-t border-line grain">
      <div className="absolute inset-0 spotlight" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="eyebrow text-accent">Curtain up</p>
        <h2 className="headline text-5xl sm:text-7xl mt-5">
          Act Two starts with a page <em>you already wrote.</em>
        </h2>
        <div className="mt-10 flex justify-center">
          <LinkButton to={signedIn ? '/app' : '/login'} size="lg" icon={<ArrowRight className="w-4 h-4" />}>
            {signedIn ? 'Open my dashboard' : 'Read my resume — free'}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
          <Wordmark size={24} />
          <p className="text-xs text-fg-subtle mt-3 max-w-md leading-relaxed">
            Delhi-NCR pilot. Roles are team-drafted hypotheses, demand data is simulated, and scores are estimated skill fit — never hiring probability.
          </p>
        </div>
        <p className="text-xs text-fg-subtle">SAP Hackfest 2026 · Inclusive Workforce</p>
      </div>
    </footer>
  );
}
