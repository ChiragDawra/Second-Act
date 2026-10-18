import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BarChart3, Briefcase, Check, GraduationCap, Headphones, Landmark, Search, ShieldCheck, TestTube2, UserRound, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { errorMessage } from '../lib/api';
import { useOnboard, useOnboardingOptions } from '../lib/queries';
import type { Sector } from '../lib/types';
import { Button, Card, Chips, cn, ErrorState, Field, FullPageLoader, Notice, Spinner, TextArea, Wordmark } from '../ui/kit';

type AccountType = 'worker' | 'mentor' | 'recruiter' | 'admin';

const TYPES: { id: AccountType; title: string; body: string; icon: LucideIcon; note?: string }[] = [
  { id: 'worker', title: 'I am looking for my next role', body: 'Upload your resume, see which nearby roles fit, and close the gaps that matter.', icon: UserRound },
  { id: 'mentor', title: 'I want to mentor', body: 'Help people making the move you already made. You only see what they choose to share.', icon: GraduationCap, note: 'Needs admin approval' },
  { id: 'recruiter', title: 'I am hiring', body: 'Review candidates who chose to share with your organisation and post your openings.', icon: Briefcase, note: 'Needs admin approval' },
];

const SECTOR_ICON: Record<Sector, LucideIcon> = { qa: TestTube2, 'banking-ba': Landmark, support: Headphones, data: BarChart3 };
const LANGUAGES = ['English', 'Hindi', 'Punjabi', 'Bengali', 'Marathi', 'Tamil', 'Telugu'];

export default function Onboarding() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const options = useOnboardingOptions();
  const onboard = useOnboard();

  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<AccountType | null>(null);
  const suggested = me.data?.status === 'needs_onboarding' ? (me.data.suggested_name ?? '') : '';
  const [name, setName] = useState(suggested);
  const [sector, setSector] = useState<Sector | null>(null);
  const [city, setCity] = useState<string[]>([]);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [hours, setHours] = useState('3');
  const [languages, setLanguages] = useState<string[]>(['English', 'Hindi']);
  const [org, setOrg] = useState('');

  const filteredSkills = useMemo(() => {
    const q = skillSearch.trim().toLowerCase();
    return (options.data?.skills ?? []).filter((s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [options.data, skillSearch]);

  if (me.data?.status === 'active') return <Navigate to="/app" replace />;
  if (me.data?.status === 'pending' || me.data?.status === 'rejected') return <Navigate to="/pending" replace />;
  if (me.isPending || options.isPending) return <FullPageLoader label="Preparing your setup…" />;
  if (options.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <ErrorState error={options.error} onRetry={() => void options.refetch()} />
      </div>
    );
  }
  const adminEligible = me.data?.status === 'needs_onboarding' && me.data.admin_eligible;
  const types = adminEligible
    ? [...TYPES, { id: 'admin' as const, title: 'Administrator', body: 'Your email is on the admin list. Approve mentors and recruiters, watch system health.', icon: ShieldCheck }]
    : TYPES;

  const valid =
    name.trim().length >= 2 &&
    (type === 'worker'
      ? !!sector
      : type === 'mentor'
        ? headline.trim().length >= 5 && bio.trim().length >= 20 && sectors.length > 0 && skills.length > 0 && Number(hours) >= 1 && languages.length > 0
        : type === 'recruiter'
          ? org.trim().length >= 2
          : type === 'admin');

  const submit = () => {
    if (!type) return;
    const body =
      type === 'worker'
        ? { account_type: type, display_name: name.trim(), sector, city: city[0], headline: headline.trim() || undefined }
        : type === 'mentor'
          ? { account_type: type, display_name: name.trim(), headline: headline.trim(), bio: bio.trim(), sectors, skill_ids: skills, availability_hours_per_week: Number(hours), languages }
          : type === 'recruiter'
            ? { account_type: type, display_name: name.trim(), organization_name: org.trim() }
            : { account_type: type, display_name: name.trim() };
    onboard.mutate(body, { onSuccess: () => navigate('/app', { replace: true }) });
  };

  return (
    <div className="relative min-h-screen bg-canvas grain overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[420px] spotlight pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-5 py-12">
        <div className="flex items-center gap-2.5 mb-12">
          <Wordmark size={26} />
          <span className="ml-auto eyebrow">Step {step} of 2</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
              <h1 className="headline text-5xl sm:text-6xl">
                Welcome{suggested ? `, ${suggested.split(' ')[0]}` : ''}. <em>Which part</em> will you play?
              </h1>
              <p className="text-fg-muted mt-4">You choose this once. It decides which dashboard you see.</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-8">
                {types.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={cn(
                      'text-left rounded-2xl border p-5 transition-all bg-surface hover:border-line-strong',
                      type === t.id ? 'border-accent/50 bg-accent/[0.06] shadow-glow' : 'border-line',
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', type === t.id ? 'bg-accent text-accent-ink' : 'bg-accent/10 text-accent')}>
                        <t.icon className="w-5 h-5" />
                      </div>
                      {type === t.id ? <Check className="w-5 h-5 text-accent" /> : null}
                    </div>
                    <p className="font-semibold text-fg mt-4">{t.title}</p>
                    <p className="text-sm text-fg-subtle mt-1 leading-relaxed">{t.body}</p>
                    {'note' in t && t.note ? <p className="text-[11px] font-mono text-coral mt-3">{t.note}</p> : null}
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-8">
                <Button size="lg" disabled={!type} onClick={() => setStep(2)} icon={<ArrowRight className="w-4 h-4" />}>
                  Continue
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-6">
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-subtle hover:text-fg">
                <ArrowLeft className="w-3.5 h-3.5" /> Change account type
              </button>

              <Card className="space-y-5">
                <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />

                {type === 'worker' ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-fg-muted">Which sector is your experience in?</p>
                      <p className="text-[11px] text-fg-subtle">Your dashboard leads with roles in this sector. Nearby roles in other sectors still show when your skills fit.</p>
                      <div className="grid sm:grid-cols-2 gap-3 mt-3">
                        {options.data.sectors.map((s) => {
                          const Icon = SECTOR_ICON[s.id];
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSector(s.id)}
                              className={cn('text-left rounded-xl border p-4 bg-surface transition-all', sector === s.id ? 'border-accent/40 ring-4 ring-accent/40' : 'border-line hover:border-accent/40')}
                            >
                              <div className="flex items-center gap-2.5">
                                <Icon className={cn('w-4 h-4', sector === s.id ? 'text-accent' : 'text-fg-subtle')} />
                                <span className="font-semibold text-sm text-fg">{s.label}</span>
                              </div>
                              <p className="text-[11px] text-fg-subtle mt-2 leading-relaxed">{s.roles.join(' · ')}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-fg-muted mb-2">Where in Delhi-NCR do you want to work? (optional)</p>
                      <Chips options={options.data.cities.map((c) => ({ value: c, label: c }))} value={city} onChange={setCity} />
                    </div>
                    <Field label="Headline (optional)" placeholder="e.g. 9 years in retail banking operations" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
                  </>
                ) : null}

                {type === 'mentor' ? (
                  <>
                    <Field label="Headline" placeholder="e.g. Business analyst, 12 years in BFSI" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
                    <TextArea label="About you" hint="Your move, and how you help others make theirs (20+ characters)." value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} />
                    <div>
                      <p className="text-xs font-semibold text-fg-muted mb-2">Sectors you mentor in</p>
                      <Chips multiple options={options.data.sectors.map((s) => ({ value: s.id, label: s.label }))} value={sectors} onChange={setSectors} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-fg-muted">Skills you can help with ({skills.length}/15)</p>
                      <div className="relative mt-2">
                        <Search className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          value={skillSearch}
                          onChange={(e) => setSkillSearch(e.target.value)}
                          placeholder="Search skills"
                          className="w-full rounded-xl border border-line pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      </div>
                      <div className="mt-3 max-h-52 overflow-y-auto flex flex-wrap gap-2 p-1">
                        {filteredSkills.map((s) => {
                          const on = skills.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              disabled={!on && skills.length >= 15}
                              onClick={() => setSkills((prev) => (on ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                              className={cn(
                                'px-2.5 py-1 rounded-full border text-xs font-medium disabled:opacity-40',
                                on ? 'bg-accent text-accent-ink border-accent' : 'bg-surface text-fg-muted border-line hover:border-accent/40',
                              )}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-[160px_1fr] gap-4">
                      <Field label="Hours per week" type="number" min={1} max={20} value={hours} onChange={(e) => setHours(e.target.value)} />
                      <div>
                        <p className="text-xs font-semibold text-fg-muted mb-2">Languages</p>
                        <Chips multiple options={LANGUAGES.map((l) => ({ value: l, label: l }))} value={languages} onChange={setLanguages} />
                      </div>
                    </div>
                    <Notice tone="warn">An administrator reviews mentor accounts before job seekers can find you. We will show your status when you sign in.</Notice>
                  </>
                ) : null}

                {type === 'recruiter' ? (
                  <>
                    <Field label="Organisation" placeholder="Your company's registered name" value={org} onChange={(e) => setOrg(e.target.value)} maxLength={100} />
                    <Notice tone="warn">
                      An administrator confirms recruiter accounts before you can see any candidate. You will only ever see people who chose to share with your organisation.
                    </Notice>
                  </>
                ) : null}

                {type === 'admin' ? <Notice tone="info">Your verified email is on this server&rsquo;s admin list.</Notice> : null}
              </Card>

              {onboard.isError ? <Notice tone="danger">{errorMessage(onboard.error)}</Notice> : null}
              <div className="flex justify-end">
                <Button size="lg" disabled={!valid} loading={onboard.isPending} onClick={submit} icon={<Check className="w-4 h-4" />}>
                  {type === 'worker' || type === 'admin' ? 'Create my dashboard' : 'Submit for approval'}
                </Button>
              </div>
              {onboard.isPending ? <Spinner label="Setting up your account…" /> : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
