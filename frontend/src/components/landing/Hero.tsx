import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, Clock } from 'lucide-react';
import { FitDial, LinkButton } from '../../ui/kit';
import { PERSONAS } from './personas';
import { ResumeReader } from './ResumeReader';

export function Hero({ signedIn }: { signedIn: boolean }) {
  const ritu = PERSONAS[0];
  const role = ritu.roles[0];
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28 grain">
      <div className="absolute inset-0 spotlight" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
        <div>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="eyebrow text-accent">
            Delhi-NCR pilot · free for job seekers
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="headline text-[3.4rem] sm:text-[5.2rem] mt-5">
            Your experience isn&rsquo;t obsolete.
            <br />
            It&rsquo;s <em>Act One.</em>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="text-lg text-fg-muted mt-7 max-w-xl leading-relaxed">
            Second Act reads your resume, keeps what you have done apart from what you plan to learn, and shows the roles you are already closest to — with the exact skills between you and them.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="flex flex-wrap gap-3 mt-9">
            <LinkButton to={signedIn ? '/app' : '/login'} size="lg" icon={<ArrowRight className="w-4 h-4" />}>
              {signedIn ? 'Open my dashboard' : 'Read my resume'}
            </LinkButton>
            <a href="#demo" className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-line text-fg-muted hover:text-fg hover:border-line-strong font-semibold text-[15px] transition-colors">
              <ArrowDown className="w-4 h-4" /> Watch it read one
            </a>
          </motion.div>
          <p className="text-xs text-fg-subtle mt-8 max-w-md leading-relaxed">
            Rules you can inspect, not an AI guess. Every skill quotes your own sentence. Nobody sees anything you have not approved.
          </p>
        </div>

        <div className="relative">
          <motion.div initial={{ opacity: 0, rotate: -1.5, y: 20 }} animate={{ opacity: 1, rotate: -1.5, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
            <ResumeReader persona={ritu} legend />
          </motion.div>
          {role ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="sm:absolute sm:-bottom-20 sm:-right-6 mt-5 sm:mt-0 sm:w-[300px] rounded-2xl border border-accent/30 bg-surface-2/95 backdrop-blur-xl p-4 shadow-glow"
            >
              <div className="flex items-center gap-3">
                <FitDial score={role.fit} size={52} />
                <div className="min-w-0">
                  <p className="eyebrow text-accent">From {ritu.from}</p>
                  <p className="font-medium text-fg leading-snug mt-1 truncate">{role.title}</p>
                </div>
              </div>
              <p className="text-[11px] text-fg-subtle mt-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> {role.hours}h of study takes estimated fit from {Math.round(role.fit ?? 0)} to {Math.round(role.after ?? 0)}
              </p>
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
