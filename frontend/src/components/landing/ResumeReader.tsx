import { motion } from 'framer-motion';
import { Fragment, type ReactNode } from 'react';
import { cn } from '../../ui/kit';
import type { Persona } from './personas';

type MarkType = 'explicit_current' | 'coursework' | 'future_goal' | 'negated_or_no_experience' | 'ambiguous';

export const MARK_STYLE: Record<MarkType, { label: string; className: string; dot: string }> = {
  explicit_current: { label: 'Done it', className: 'bg-accent/20 text-fg shadow-[inset_0_-2px_0_rgb(var(--accent))]', dot: 'bg-accent' },
  coursework: { label: 'Course', className: 'bg-azure/15 text-fg shadow-[inset_0_-2px_0_rgb(var(--azure))]', dot: 'bg-azure' },
  future_goal: { label: 'Goal', className: 'bg-iris/15 text-fg shadow-[inset_0_-2px_0_rgb(var(--iris))]', dot: 'bg-iris' },
  negated_or_no_experience: { label: 'Not yet', className: 'bg-[#1E1A14]/10 line-through', dot: 'bg-fg-subtle' },
  ambiguous: { label: 'Check', className: 'bg-coral/15 text-fg shadow-[inset_0_-2px_0_rgb(var(--coral))]', dot: 'bg-coral' },
};

/** Splits a line into plain text and highlighted phrases; overlapping marks keep the first placed. */
function highlight(text: string, marks: ReadonlyArray<{ text: string; type: string }>): ReactNode[] {
  const ranges: Array<{ start: number; end: number; type: MarkType }> = [];
  for (const m of [...marks].sort((a, b) => b.text.length - a.text.length)) {
    const start = text.toLowerCase().indexOf(m.text.toLowerCase());
    if (start === -1) continue;
    const end = start + m.text.length;
    if (ranges.some((r) => start < r.end && end > r.start)) continue;
    ranges.push({ start, end, type: m.type as MarkType });
  }
  ranges.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let at = 0;
  ranges.forEach((r, i) => {
    if (r.start > at) out.push(<Fragment key={`t${i}`}>{text.slice(at, r.start)}</Fragment>);
    const style = MARK_STYLE[r.type];
    out.push(
      <mark key={`m${i}`} className={cn('rounded-[4px] px-0.5 -mx-0.5', style.className)}>
        {text.slice(r.start, r.end)}
      </mark>,
    );
    at = r.end;
  });
  if (at < text.length) out.push(<Fragment key="end">{text.slice(at)}</Fragment>);
  return out;
}

export function Legend({ className, onPaper }: { className?: string; onPaper?: boolean }) {
  const types: MarkType[] = ['explicit_current', 'coursework', 'future_goal', 'negated_or_no_experience'];
  return (
    <div className={cn('flex flex-wrap gap-x-4 gap-y-1.5', className)}>
      {types.map((t) => (
        <span key={t} className={cn('inline-flex items-center gap-1.5 text-[11px]', onPaper ? 'text-[#1E1A14]/55' : 'text-fg-subtle')}>
          <span className={cn('w-2 h-2 rounded-sm', MARK_STYLE[t].dot)} />
          {MARK_STYLE[t].label}
        </span>
      ))}
    </div>
  );
}

/** A resume page with every phrase the extractor found, coloured by what the sentence says about it. */
export function ResumeReader({ persona, className, animate = true, legend }: { persona: Persona; className?: string; animate?: boolean; legend?: boolean }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-[#F6F1E7] text-[#1E1A14] p-5 sm:p-6 shadow-pop', className)}>
      <div className="flex items-baseline justify-between gap-3 border-b border-[#1E1A14]/10 pb-3 mb-3">
        <p className="font-display text-2xl leading-none">{persona.name}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#1E1A14]/50">{persona.place} · resume.pdf</p>
      </div>
      <ul className="space-y-2 text-[13px] leading-relaxed [&_mark]:text-[#1E1A14]">
        {persona.lines.map((l, i) => (
          <motion.li
            key={l.text}
            className="flex gap-2"
            initial={animate ? { opacity: 0, y: 6 } : false}
            whileInView={animate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.12, duration: 0.4 }}
          >
            <span className="text-[#1E1A14]/30 select-none">–</span>
            <span>{highlight(l.text, l.marks)}</span>
          </motion.li>
        ))}
      </ul>
      {legend ? <Legend onPaper className="mt-4 pt-3 border-t border-[#1E1A14]/10" /> : null}
    </div>
  );
}
