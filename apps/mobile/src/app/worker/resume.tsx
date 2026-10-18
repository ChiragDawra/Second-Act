import { useMutation, useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { api, apiUpload, errorMessage } from '../../lib/api';
import { colors } from '../../lib/theme';
import type { NcrExtractedSkill, NcrExtraction, NcrMeta, NcrRecommendation, NcrRole } from '../../lib/types';
import { Chip, ReadinessChip, StatusChip, tones } from '../../ui/badges';
import { CheckRow, Field, Stepper } from '../../ui/forms';
import { MatchRing } from '../../ui/MatchRing';
import { Bullet, Button, Card, Row, Section, Stack, Text } from '../../ui/primitives';
import { Screen } from '../../ui/Screen';
import { Notice, QueryView } from '../../ui/states';

type Choice = { on: boolean; level: number };

const MENTION_LABEL: Record<NcrExtractedSkill['mention_type'], string> = {
  explicit_current: 'Current claim',
  coursework: 'Course or exposure',
  future_goal: 'Future goal',
  negated_or_no_experience: 'No experience stated',
  ambiguous: 'Needs your check',
};

const isCurrentLike = (s: NcrExtractedSkill) => s.mention_type === 'explicit_current' || s.mention_type === 'coursework' || s.mention_type === 'ambiguous';

export default function WorkerResume() {
  const meta = useQuery({ queryKey: ['ncr-meta'], queryFn: () => api<NcrMeta>('/ncr/meta') });
  const [text, setText] = useState('');
  const [extraction, setExtraction] = useState<NcrExtraction | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [cities, setCities] = useState<string[]>([]);
  const [result, setResult] = useState<NcrRecommendation | null>(null);

  const onExtracted = (data: NcrExtraction) => {
    setExtraction(data);
    setResult(null);
    // Only explicit current claims start accepted; coursework and unclear mentions start off.
    setChoices(
      Object.fromEntries(
        data.extraction.skills.filter(isCurrentLike).map((s) => [s.skill_id, { on: s.mention_type === 'explicit_current', level: s.suggested_level ?? 2 }]),
      ),
    );
  };

  const readText = useMutation({
    mutationFn: () => apiUpload<NcrExtraction>('/ncr/resume/extract', text, 'text/plain'),
    onSuccess: onExtracted,
  });

  const pickFile = useMutation({
    mutationFn: async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets[0]) return null;
      const bytes = await (await fetch(picked.assets[0].uri)).arrayBuffer();
      return apiUpload<NcrExtraction>('/ncr/resume/extract', bytes, 'application/octet-stream');
    },
    onSuccess: (data) => {
      if (data) onExtracted(data);
    },
  });

  const match = useMutation({
    mutationFn: () => {
      const skills = (extraction?.extraction.skills ?? [])
        .filter((s) => isCurrentLike(s) && choices[s.skill_id]?.on)
        .map((s) => ({ skill_id: s.skill_id, mention_type: s.mention_type, level: choices[s.skill_id]!.level, evidence: s.evidence.slice(0, 400) }));
      return api<NcrRecommendation>('/ncr/recommend', { method: 'POST', body: { skills, preferences: cities.length ? { cities } : {} } });
    },
    onSuccess: setResult,
  });

  const skills = extraction?.extraction.skills ?? [];
  const current = skills.filter(isCurrentLike);
  const notCurrent = skills.filter((s) => !isCurrentLike(s));
  const accepted = current.filter((s) => choices[s.skill_id]?.on).length;
  const busy = readText.isPending || pickFile.isPending;
  const error = readText.error ?? pickFile.error ?? match.error;

  return (
    <Screen title="Resume" subtitle="Delhi-NCR pilot: read a resume, review what it says, see nearby roles.">
      <Stack gap={14}>
        <QueryView query={meta}>
          {(m) => (
            <Notice tone="warn">
              <Row wrap>
                <Chip label="PILOT" mono t={tones.amber} />
                <Chip label="SIMULATED LISTINGS" mono t={tones.violet} />
                <Chip label="ROLES UNREVIEWED" mono t={tones.amber} />
              </Row>
              <Text variant="small">{m.labels.roles}. {m.labels.listings}. Your resume is read in memory and is not stored.</Text>
            </Notice>
          )}
        </QueryView>

        <Section title="1. Add your resume" subtitle="PDF, DOCX or plain text. Paste text if you prefer.">
          <Stack gap={10}>
            <Field label="Paste resume text" multiline value={text} onChangeText={setText} placeholder="Skills, experience, goals…" style={{ minHeight: 140 }} />
            <Row wrap>
              <Button label="Read pasted text" onPress={() => readText.mutate()} loading={readText.isPending} disabled={busy || text.trim().length < 20} />
              <Button label="Choose a file" kind="secondary" onPress={() => pickFile.mutate()} loading={pickFile.isPending} disabled={busy} />
            </Row>
          </Stack>
        </Section>

        {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}

        {extraction ? (
          <Section title="2. Review what was found" subtitle={`${extraction.extraction.extractor_version} · rules only, no AI model. Nothing is used until you confirm it.`}>
            <Stack gap={10}>
              {current.length === 0 ? <Notice tone="muted">No skills from the pilot list were found as current claims.</Notice> : null}
              {current.map((s) => {
                const c = choices[s.skill_id] ?? { on: false, level: 2 };
                return (
                  <Card key={s.skill_id} tone={c.on ? 'info' : undefined}>
                    <CheckRow
                      label={s.canonical_name}
                      description={`${MENTION_LABEL[s.mention_type]} · ${s.section}`}
                      checked={c.on}
                      onToggle={() => setChoices((prev) => ({ ...prev, [s.skill_id]: { ...c, on: !c.on } }))}
                    />
                    <Text variant="small" style={{ color: colors.ink600 }}>“{s.evidence}”</Text>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <StatusChip status={c.on ? 'self_reported' : s.status} />
                      <Row>
                        <Text variant="caption">Your level (1 Aware – 4 Expert)</Text>
                        <Stepper value={c.level} min={1} max={4} onChange={(level) => setChoices((prev) => ({ ...prev, [s.skill_id]: { ...c, level } }))} />
                      </Row>
                    </Row>
                  </Card>
                );
              })}

              {notCurrent.length > 0 ? (
                <Card tone="muted">
                  <Text variant="label">Not counted as current skills</Text>
                  {notCurrent.map((s) => (
                    <Row key={s.skill_id} wrap style={{ alignItems: 'flex-start' }}>
                      <Chip label={MENTION_LABEL[s.mention_type]} t={tones.grey} />
                      <Text variant="small" style={{ flex: 1 }}>{s.canonical_name}: “{s.evidence}”</Text>
                    </Row>
                  ))}
                  <Text variant="caption">Goals and “no experience” statements cannot be added as skills. Learn them, then prove them.</Text>
                </Card>
              ) : null}

              <Text variant="label">Where do you want to work? (optional)</Text>
              <Row wrap>
                {(meta.data?.cities ?? []).map((city) => (
                  <Button
                    key={city}
                    compact
                    label={city}
                    kind={cities.includes(city) ? 'primary' : 'secondary'}
                    onPress={() => setCities((prev) => (prev.includes(city) ? prev.filter((x) => x !== city) : [...prev, city]))}
                  />
                ))}
              </Row>
              <Button label={`Match roles with ${accepted} confirmed skill${accepted === 1 ? '' : 's'}`} onPress={() => match.mutate()} loading={match.isPending} disabled={match.isPending || accepted === 0} />
            </Stack>
          </Section>
        ) : null}

        {result ? <Results result={result} /> : null}
      </Stack>
    </Screen>
  );
}

function Results({ result }: { result: NcrRecommendation }) {
  return (
    <Section title="3. Nearby roles" subtitle={`Estimated skill fit, not a hiring probability · ${result.dataset_version} · ${result.scoring_version}`}>
      <Stack gap={10}>
        {result.message ? <Notice tone="warn">{result.message}</Notice> : null}
        {result.top_roles.map((r) => (
          <RoleCard key={r.role_id} role={r} />
        ))}
        {result.stretch_roles.length > 0 ? (
          <Card tone="muted">
            <Text variant="label">Stretch roles (blocked by a mandatory requirement)</Text>
            {result.stretch_roles.map((r) => (
              <Text key={r.role_id} variant="small">
                {r.title}: {r.mandatory_blockers.map((b) => b.name).join(', ') || 'a mandatory requirement'}
              </Text>
            ))}
          </Card>
        ) : null}
        <Notice tone="muted">
          <Stack gap={4}>
            {result.limitations.map((l) => (
              <Bullet key={l}>
                <Text variant="caption">{l}</Text>
              </Bullet>
            ))}
          </Stack>
        </Notice>
      </Stack>
    </Section>
  );
}

function RoleCard({ role }: { role: NcrRole }) {
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Stack gap={4} style={{ flex: 1 }}>
          <Text variant="heading">{role.title}</Text>
          <Row wrap>
            <ReadinessChip status={role.readiness_status} />
            <Chip label={`Evidence confidence ${role.evidence_confidence}%`} t={tones.blue} />
          </Row>
        </Stack>
        <MatchRing score={role.estimated_skill_fit} label="est. fit" />
      </Row>
      {role.matching_skills.slice(0, 5).map((m) => (
        <Text key={m.skill_id} variant="small">
          ✓ {m.name} (level {m.worker_level} of {m.required_level} needed){m.evidence ? ` — “${m.evidence.slice(0, 90)}”` : ''}
        </Text>
      ))}
      {role.critical_gaps.slice(0, 3).map((g) => (
        <Text key={g.skill_id} variant="small" style={{ color: colors.amber800 }}>
          Gap: {g.name} ({g.worker_level ?? 0} → {g.required_level})
        </Text>
      ))}
      {role.mandatory_blockers.map((b) => (
        <Text key={b.skill_id} variant="small" style={{ color: colors.red }}>
          Mandatory: {b.name}. {b.reason}
        </Text>
      ))}
      {role.unknown_requirements.length > 0 ? (
        <Text variant="caption">Unknown, not counted as missing: {role.unknown_requirements.map((u) => u.name).join(', ')}</Text>
      ) : null}
      <Row wrap>
        <Chip label={`SIMULATED SAMPLE · ${role.demand_signal.sample_size} listing${role.demand_signal.sample_size === 1 ? '' : 's'}`} mono t={tones.violet} />
        <Chip label="NO LIVE VACANCIES" mono t={tones.grey} />
      </Row>
      <Text variant="caption">{role.requirement_source.freshness_note}</Text>
    </Card>
  );
}
