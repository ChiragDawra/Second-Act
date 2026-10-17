import { View } from 'react-native';
import type { Eligibility, Readiness, SkillStatus } from '../lib/types';
import { colors, fonts, PROFICIENCY_LABELS, radius } from '../lib/theme';
import { Row, Text } from './primitives';

type Tone = { fg: string; bg: string; border: string };
const tone = {
  green: { fg: colors.green, bg: colors.green50, border: colors.green200 },
  blue: { fg: colors.sap800, bg: colors.sap50, border: colors.sap200 },
  amber: { fg: colors.amber800, bg: colors.amber50, border: colors.amber200 },
  red: { fg: colors.red, bg: colors.red50, border: colors.red200 },
  grey: { fg: colors.ink600, bg: colors.ink100, border: colors.ink200 },
  violet: { fg: colors.violet, bg: colors.violet50, border: colors.violet200 },
} satisfies Record<string, Tone>;

export function Chip({ label, t = tone.grey, mono }: { label: string; t?: Tone; mono?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border }}>
      <Text style={{ fontFamily: mono ? fonts.mono : fonts.semibold, fontSize: mono ? 10 : 11.5, color: t.fg, letterSpacing: mono ? 0.6 : 0 }}>
        {label}
      </Text>
    </View>
  );
}

const statusMeta: Record<SkillStatus, { label: string; t: Tone }> = {
  verified: { label: 'Verified', t: tone.green },
  self_reported: { label: 'Self-reported', t: tone.blue },
  inferred: { label: 'Inferred · needs review', t: tone.amber },
  unknown: { label: 'Unknown', t: tone.grey },
  not_demonstrated: { label: 'Not demonstrated', t: tone.red },
};

export function StatusChip({ status }: { status: SkillStatus }) {
  const m = statusMeta[status];
  return <Chip label={m.label} t={m.t} />;
}

export function ReadinessChip({ status }: { status: Readiness }) {
  const map: Record<Readiness, { label: string; t: Tone }> = {
    ready: { label: 'Ready', t: tone.green },
    needs_validation: { label: 'Needs validation', t: tone.amber },
    blocked: { label: 'Blocked by mandatory gap', t: tone.red },
  };
  return <Chip label={map[status].label} t={map[status].t} />;
}

export function EligibilityChip({ value }: { value: Eligibility }) {
  const map: Record<Eligibility, { label: string; t: Tone }> = {
    eligible: { label: 'Eligible', t: tone.green },
    stretch: { label: 'Stretch role', t: tone.amber },
    filtered: { label: 'Filtered by your constraints', t: tone.grey },
    data_error: { label: 'Data error', t: tone.red },
  };
  return <Chip label={map[value].label} t={map[value].t} />;
}

/** What is real, synthetic, simulated or planned — shown wherever such data appears. */
export function Provenance({ kind }: { kind: 'live' | 'synthetic' | 'simulated' | 'planned' | 'demo-assessment' }) {
  const map = {
    live: { label: 'LIVE', t: tone.green },
    synthetic: { label: 'SYNTHETIC', t: tone.violet },
    simulated: { label: 'SIMULATED', t: tone.amber },
    planned: { label: 'PLANNED', t: tone.grey },
    'demo-assessment': { label: 'DEMO ASSESSMENT', t: tone.blue },
  } as const;
  return <Chip label={map[kind].label} t={map[kind].t} mono />;
}

/** Five-step proficiency meter (0–4). Unknown renders as an outlined "?" rather than zero. */
export function LevelMeter({ level, required, color = colors.sap }: { level: number | null; required?: number; color?: string }) {
  return (
    <Row gap={6}>
      <Row gap={3}>
        {[1, 2, 3, 4].map((step) => {
          const filled = level !== null && level >= step;
          const isRequired = required !== undefined && step === required;
          return (
            <View
              key={step}
              style={{
                width: 16,
                height: 6,
                borderRadius: 3,
                backgroundColor: filled ? color : colors.ink100,
                borderWidth: isRequired ? 1.5 : 0,
                borderColor: colors.ink900,
              }}
            />
          );
        })}
      </Row>
      <Text variant="caption">
        {level === null ? 'Unknown' : `${level} · ${PROFICIENCY_LABELS[level]}`}
        {required !== undefined ? `  (needs ${required})` : ''}
      </Text>
    </Row>
  );
}

export const tones = tone;
