import type { Queryable } from '../db/types.ts';
import { engineInputs } from './adjacency.ts';
import { NCR_SECTORS, type NcrDataset, type NcrSector } from './dataset.ts';

/**
 * The Delhi-NCR dataset stored in the database next to the demo catalogue.
 *
 * Database ids carry an `ncr-` prefix ("ncr-sql-querying") because both catalogues define some
 * of the same skill slugs with different meanings. The extractor and the CSV files keep the
 * unprefixed ids; these helpers translate at the boundary.
 */

export const NCR_PREFIX = 'ncr-';
export const toDbId = (id: string) => (id.startsWith(NCR_PREFIX) ? id : `${NCR_PREFIX}${id}`);
export const fromDbId = (id: string) => (id.startsWith(NCR_PREFIX) ? id.slice(NCR_PREFIX.length) : id);

export function sectorOfRole(ds: NcrDataset, roleId: string): NcrSector | null {
  const plain = fromDbId(roleId);
  return NCR_SECTORS.find((s) => ds.config.sectors[s].roles.includes(plain)) ?? null;
}

/** Idempotent, batched upsert of the Delhi-NCR skills, roles and requirements. Service context only. */
export async function upsertNcrCatalog(q: Queryable, ds: NcrDataset): Promise<void> {
  const { config } = ds;
  const versions = [
    { id: config.taxonomy_version, kind: 'taxonomy', description: `Delhi-NCR pilot taxonomy: ${ds.skills.length} skills, ${ds.aliases.length} aliases. Team-curated, unreviewed.` },
    { id: config.dataset_version, kind: 'roles', description: `Delhi-NCR pilot roles: ${ds.roles.length} team-drafted roles in four sectors, ${ds.roleSkills.length} requirements. Not reviewed by a domain expert.` },
  ];
  await q.query(
    `insert into public.dataset_versions (id, kind, description, source, released_at, is_synthetic)
     select x.id, x.kind, x.description, 'Second Act Delhi-NCR pilot (data/delhi_ncr/v1)', $2::date, false
     from jsonb_to_recordset($1::jsonb) as x(id text, kind text, description text)
     on conflict (id) do update set kind = excluded.kind, description = excluded.description, source = excluded.source`,
    [JSON.stringify(versions), config.collected_at],
  );

  const { catalog, roles } = engineInputs(ds);
  const skillRows = ds.skills.map((s) => ({
    id: toDbId(s.id),
    canonical_name: s.name,
    category: s.category,
    description: s.description,
    aliases: s.aliases,
    hours: catalog.find((c) => c.id === s.id)!.learning_hours_per_level,
  }));
  await q.query(
    `insert into public.skills (id, canonical_name, category, description, aliases, learning_hours_per_level, taxonomy_source, taxonomy_version, catalogue)
     select x.id, x.canonical_name, x.category, x.description, array(select jsonb_array_elements_text(x.aliases)), x.hours,
            'Second Act Delhi-NCR pilot taxonomy (no external ids imported)', $2, 'ncr'
     from jsonb_to_recordset($1::jsonb) as x(id text, canonical_name text, category text, description text, aliases jsonb, hours int)
     on conflict (id) do update set canonical_name = excluded.canonical_name, category = excluded.category,
       description = excluded.description, aliases = excluded.aliases,
       learning_hours_per_level = excluded.learning_hours_per_level, taxonomy_version = excluded.taxonomy_version`,
    [JSON.stringify(skillRows), config.taxonomy_version],
  );

  const roleRows = roles.map((r) => {
    const row = ds.roles.find((x) => x.id === r.id)!;
    const sector = sectorOfRole(ds, r.id)!;
    const sample = ds.evidence.filter((e) => e.canonical_role_id === r.id).length;
    return {
      id: toDbId(r.id),
      title: r.title,
      family: sector,
      description: `${row.sector} · ${row.seniority}. Team-drafted pilot role for ${config.region_scope}; requirements not yet reviewed by a domain expert.`,
      work_mode: r.work_mode,
      locations: r.locations,
      demand_note: `Simulated sample of ${sample} listing${sample === 1 ? '' : 's'} written by the team. Not market demand and not live vacancies.`,
    };
  });
  await q.query(
    `insert into public.roles (id, title, family, description, employment_type, work_mode, locations, salary_min_lpa, salary_max_lpa,
                               salary_note, demand_note, source, dataset_version, last_reviewed_at, catalogue)
     select x.id, x.title, x.family, x.description, 'employee', x.work_mode, array(select jsonb_array_elements_text(x.locations)), null, null,
            'No salary data in the Delhi-NCR pilot.', x.demand_note, 'Second Act Delhi-NCR pilot (team-drafted hypothesis)', $2, $3::date, 'ncr'
     from jsonb_to_recordset($1::jsonb) as x(id text, title text, family text, description text, work_mode text, locations jsonb, demand_note text)
     on conflict (id) do update set title = excluded.title, family = excluded.family, description = excluded.description,
       work_mode = excluded.work_mode, locations = excluded.locations, demand_note = excluded.demand_note,
       dataset_version = excluded.dataset_version, last_reviewed_at = excluded.last_reviewed_at`,
    [JSON.stringify(roleRows), config.dataset_version, config.collected_at],
  );

  const reqRows = ds.roleSkills.map((rs) => ({
    role_id: toDbId(rs.role_id),
    skill_id: toDbId(rs.skill_id),
    w: rs.importance_weight,
    lvl: rs.required_proficiency,
    m: rs.is_mandatory,
    rubric: rs.evidence_rationale,
  }));
  await q.query(
    `insert into public.role_requirements (role_id, skill_id, importance_weight, required_level, is_mandatory, evidence_rubric)
     select x.role_id, x.skill_id, x.w, x.lvl, x.m, x.rubric
     from jsonb_to_recordset($1::jsonb) as x(role_id text, skill_id text, w int, lvl int, m boolean, rubric text)
     on conflict (role_id, skill_id) do update set importance_weight = excluded.importance_weight,
       required_level = excluded.required_level, is_mandatory = excluded.is_mandatory, evidence_rubric = excluded.evidence_rubric`,
    [JSON.stringify(reqRows)],
  );
}
