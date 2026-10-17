# Second Act — Tech Stack, ML Plan, and Dataset Sources

**Purpose:** Define the smallest maintainable stack and a realistic model/data strategy for a prototype that can be shipped to mentors for evaluation.

---

## 1. Stack decision

Use technologies that are easy for the team to build and debug. Do not add a graph database, vector database, message broker, Kubernetes, or multiple autonomous agents for the MVP.

| Layer | Recommended choice | Why it fits this prototype |
|---|---|---|
| Frontend | React + Vite + TypeScript | Fast iteration, strong ecosystem, simple deployment |
| UI styling | Tailwind CSS | Consistent dashboard and responsive layouts without a large design system |
| Client data | TanStack Query (optional), React Router | Request caching and simple page routing |
| API/orchestration | Node.js LTS + Express + TypeScript | Owns auth checks, CRUD, consent, and service orchestration |
| ML/matching service | Python + FastAPI + Pydantic | Python NLP ecosystem and typed request/response contracts |
| Database | Supabase PostgreSQL | Hosted relational database; simple for mentor-demo deployment |
| Authentication | Supabase Auth | Use a maintained identity system rather than storing passwords yourself |
| Optional vector search | In-memory cosine similarity initially; pgvector only if needed | A few dozen roles do not justify separate vector infrastructure |
| NLP embeddings | `sentence-transformers/all-MiniLM-L6-v2` | Compact pretrained English sentence embedding baseline; use for semantic candidate retrieval, not verification |
| Skill taxonomy | ESCO and selected O*NET tables + a project-owned canonical mapping | Reusable occupation/skill descriptions and relationships |
| Structured extraction | Taxonomy/alias matcher first; constrained LLM output as optional assistance | Makes the demo reproducible and reduces dependency on an LLM |
| Optional LLM provider | Provider behind an interface; schema-constrained output | Avoids vendor lock-in and keeps the deterministic fallback usable |
| File upload | Defer or use private object storage with short-lived signed URLs | Pasted text/synthetic profiles reduce security and parsing risks for the first demo |
| Frontend deployment | Vercel or equivalent | Straightforward static React deployment |
| Backend deployment | Managed HTTPS service supporting Node and Python services | Do not expose FastAPI publicly unless necessary; protect internal service calls |
| Testing | Vitest/React Testing Library, pytest, API integration tests | Test UI, scoring math, permissions, and flow independently |
| Version control | GitHub with `.env` ignored and secret scanning | Protect credentials and keep the demo reproducible |

### Minimal architecture rule

The Express API is the only public application API. It verifies the user and permissions before reading/writing data or invoking the FastAPI service. The Python service performs extraction support and matching. PostgreSQL remains the source of truth. If time becomes tight, prioritize the complete vertical slice over adding more services or frameworks; a temporary single-backend implementation is preferable to an incomplete distributed architecture.

## 2. ML strategy: what to build now, and what not to train

**Do not train a large language model from scratch.** The prototype is primarily a data and decision-system project with two useful NLP capabilities. Use pretrained models where they add value; use deterministic logic for decisions that need to be repeatable and auditable.

### Model/component plan

| Component | MVP implementation | Train a custom model now? | Data needed | Evaluation |
|---|---|---:|---|---|
| A. Skill extraction from worker history | Canonical taxonomy aliases + phrase matching; optionally constrained LLM extraction to proposed skills/evidence | **No** | ESCO/O*NET skill vocabulary; synthetic worker profiles and manually reviewed skill labels | Precision/recall/F1, unsupported-claim rate, evidence traceability |
| B. Skill normalization / semantic retrieval | Pretrained `sentence-transformers/all-MiniLM-L6-v2` embeddings; exact alias match takes precedence | **No** | ESCO and O*NET skill/role descriptions plus curated role-skill map | Top-K retrieval relevance, alias accuracy, manual review of false matches |
| C. Role adjacency / ranking | Transparent Python scoring and hard-constraint rules; optionally embeddings only to suggest candidate roles | **No — intentionally not ML** | 10–20 curated roles; role-skill weights, proficiency requirements, mandatory flags, transitions reviewed by a knowledgeable person | Top-3 expert relevance, repeatability, critical-gap omission rate |
| D. Learning path and task generation | Template/resource catalog plus optional LLM to explain the selected gap and draft a task | **No** | Verified learning resources and a small fixed set of assessment rubrics | Check whether task maps to the gap; rubric/manual review; no unsupported employment claim |
| E. Mentor matching | Deterministic weighted matching on gap coverage, experience relevance, availability, language and format | **No** | 8–15 explicitly synthetic demo mentor profiles | Match coverage and constraint correctness |
| F. Readiness update | Fixed assessment rubric; update only the skill tested | **No** | Assessment tasks and test cases authored for the demo | Assessment validity review, correct state updates |
| G. Future skill-span tagger | Fine-tune or adapt a token-classification model only after a labelled evaluation set is created | **Not for the first demo** | SkillSpan labels plus new manually annotated resume/work-history text | Held-out span-level precision/recall/F1; domain-shift checks |

### Why this is a better hackathon ML story

- The ML is used where text is ambiguous.
- The worker can challenge and correct proposed skills.
- The central ranking is transparent and reproducible.
- A semantic similarity score never becomes proof of competence.
- A model failure does not make the whole application unusable: manual skill entry and deterministic ranking remain possible.

## 3. Dataset sources and how to use them

Check each dataset's current version, terms, attribution, and redistribution permissions before committing it to the repository or including it in a public demo.

### Source 1 — ESCO (main skill/occupation taxonomy)

**Official download:** https://esco.ec.europa.eu/en/use-esco/download  
**Use for:** canonical skill names, descriptions, occupations, and occupation-skill relationships. It supports a structured role-skill graph without training a graph model. Select only the content and language needed for the project.

**How to use it:** download a current CSV/RDF package; retain source IDs and release version; map a focused subset into `skills.csv`, `roles.csv`, and `role_skills.csv`. Do not assume ESCO's occupation/market framing is a perfect representation of Indian employer requirements—review target roles locally.

### Source 2 — O*NET Database (occupational requirements and tasks)

**Official database/release archive:** https://www.onetcenter.org/database.html and https://www.onetcenter.org/db_releases.html  
**Use for:** role descriptions, skills, work activities, tasks, knowledge, and related occupational information. The official release archive lists O*NET 31.0 (August 2026) as the current production release at the time of this document; always verify the current release when downloading.

**Important limitation:** O*NET is US-oriented. Use it as a structured reference for occupational skills, not as proof of Indian salaries, vacancy counts, or local demand. Preserve the release number and licence/attribution requirements.

### Source 3 — SkillSpan (skill-span extraction labels)

**Repository and data:** https://github.com/kris927b/SkillSpan  
**Research paper:** https://aclanthology.org/2022.naacl-main.366/  
**Use for:** a future supervised skill/knowledge span-extraction experiment on **English job postings**. The repository describes roughly 14.5K sentences and more than 12.5K annotated spans; two of the three subsets are released. The repository provides token-level/BIO-format labels and a MIT licence for the repository, but review the dataset/source details and cite the paper before reuse.

**Limitations:** it is job-posting text, not a labelled resume dataset. The supplied training stack is old; do not assume it will run unchanged on a current environment. Reuse the labels or implement a modern token-classification pipeline separately.

### Source 4 — Resume Skill Extractor Dataset on Hugging Face (weak-labelled job descriptions)

**Dataset:** https://huggingface.co/datasets/keerthanshetty/resume-skill-extractor-dataset  
**Use for:** prototyping extraction of required skills from job descriptions; the dataset card lists 3,050 rows with title, source, job description, summary and required skills, and shows an MIT dataset licence.

**Critical caveat:** despite its name, the dataset consists of job descriptions—not actual resumes. Its summaries and required-skill lists were generated by an LLM, so treat the labels as weak labels, not gold truth. Review source data and licence/attribution before republishing derived material.

### Source 5 — Job Skill Set (additional job-description examples)

**Dataset:** https://huggingface.co/datasets/batuhanmtl/job-skill-set  
**Use for:** secondary examples of job descriptions and associated skills to inspect during job-requirement extraction and taxonomy alignment.

**Caveat:** verify the current data card, original provenance, generation method, and licence. Do not use its labels as authoritative ground truth without a manual sample audit.

### Source 6 — Manually curated project dataset (essential)

Public datasets will not give you everything needed for the product. Create a small, auditable dataset owned by the project:

| File | Suggested fields | How to create it |
|---|---|---|
| `skills.csv` | `skill_id, canonical_name, aliases, category, description, taxonomy_source, source_version` | Import a focused ESCO/O*NET subset, normalize aliases, review duplicates |
| `roles.csv` | `role_id, title, domain, region, seniority, description, source, last_verified_at` | Start with 10–20 roles in 2–4 role families |
| `role_skills.csv` | `role_id, skill_id, importance_weight, required_proficiency, is_mandatory, evidence_rubric, source` | Create from source data and have a knowledgeable reviewer inspect each target role |
| `transition_examples.csv` | `source_role_id, target_role_id, transferable_skill_ids, gap_skill_ids, reviewer_status, reviewer_notes` | Have humans review whether transitions are plausible; do not invent success rates |
| `synthetic_worker_profiles.csv` | `worker_id, experience_summary, skill_evidence, preferences, constraints` | Create diverse fictional profiles; mark them synthetic |
| `mentor_profiles_demo.csv` | `mentor_id, role_expertise, skill_ids, experience, languages, availability, format, capacity, is_synthetic` | Use fictional profiles labelled as demo data |
| `learning_resources.csv` | `resource_id, skill_id, title, url, cost_band, checked_at, verified` | Add only resources whose URLs and relevance have been checked |
| `assessment_rubrics.csv` | `assessment_id, skill_id, task, rubric_levels, pass_threshold, reviewer_type` | Write small practical tasks with clear pass criteria |
| `opportunities.csv` | `posting_id, role_id, employer, location, remote_type, salary_range, source_url, collected_at, status, is_simulated` | For the demo, use clearly simulated listings unless a permitted live source is available |

Start with software QA, IT support, data operations, and customer support as role families. These overlap with the Harpreet QA story and provide enough variety without pretending to cover every displaced occupation.

## 4. Recommended model build plan

### Stage 0 — no training; build the baseline

1. Load a curated skill taxonomy and aliases.
2. Use phrase/taxonomy matching to suggest skills with source spans.
3. Use the pretrained embedding model to find semantically similar role/skill descriptions when exact aliases fail.
4. Ask the user to confirm uncertain claims.
5. Run deterministic role scoring and hard blocker checks.
6. Produce one grounded gap action and fixed assessment.

This is the version to demo.

### Stage 1 — evaluate before training

Create a small human-reviewed set of synthetic worker-history snippets, expected skills, and role-relevance judgments. Compare taxonomy matching, semantic retrieval, and constrained LLM extraction against this test set. Keep train/development/test examples separate; do not evaluate on the same snippets used to tune prompts or aliases.

### Stage 2 — optional supervised skill extraction

If the baseline is demonstrably weak and the team has time, adapt a token-classification model using SkillSpan job-posting labels. To cover resume-style language, manually annotate a separate set of de-identified/synthetic work-history snippets with skill spans. Do not claim resume extraction performance from job-posting tests alone. A small manually annotated evaluation set is more valuable than an unreviewed large dataset.

### Models not recommended for the MVP

- No model that predicts probability of hiring or “employability.”
- No model that ranks workers for layoffs.
- No reinforcement-learning agent or unrestricted multi-agent loop.
- No custom fine-tuning of an LLM without a labelled dataset, compute budget, validation set, and a measurable baseline improvement.
- No graph neural network just to implement skill adjacency; a curated graph plus deterministic traversal/scoring is easier to audit.

## 5. Dataset preparation and split rules

1. Record source URL, dataset version, download date, licence, and transformations.
2. Keep a separate `source_id` and canonical project ID for each imported role/skill.
3. Deduplicate near-identical job posts before splitting.
4. Split by job-post source, posting, or occupation family where appropriate—not just random rows—to reduce leakage from duplicates.
5. Keep a held-out evaluation set untouched until final evaluation.
6. For manually created labels, use a review guide and resolve disagreements; label “unknown/ambiguous” rather than forcing a false positive.
7. Never upload real resumes to public GitHub, notebooks, datasets, or model-training services without a clear lawful basis, informed consent, and approved handling.

## 6. Evaluation metrics

| Component | Metrics to report |
|---|---|
| Skill extraction | Precision, recall, F1; unsupported-claim rate; evidence traceability |
| Canonicalization | Alias normalization accuracy; false merge rate |
| Semantic retrieval | Precision@K or human relevance judgment for retrieved role/skill candidates |
| Role recommendations | Expert relevance of top three; critical-gap omission rate; constraint violations; repeatability |
| Mentorship matching | Gap coverage, availability compatibility, and reason correctness |
| Assessment | Reviewer agreement with the rubric and correct skill-state update |
| Safety | Unauthorized access denial, data-sharing consent enforcement, irrelevant-field counterfactual ranking test |

Do not report impressive accuracy, placement uplift, or fairness claims until measured on a documented evaluation set. Synthetic profiles are appropriate for the demo but do not demonstrate real-world employment impact.

## 7. Dataset and model references

- ESCO official downloads: https://esco.ec.europa.eu/en/use-esco/download
- O*NET database: https://www.onetcenter.org/database.html
- O*NET release archive: https://www.onetcenter.org/db_releases.html
- SkillSpan repository: https://github.com/kris927b/SkillSpan
- SkillSpan paper: https://aclanthology.org/2022.naacl-main.366/
- Resume Skill Extractor Dataset: https://huggingface.co/datasets/keerthanshetty/resume-skill-extractor-dataset
- Job Skill Set: https://huggingface.co/datasets/batuhanmtl/job-skill-set
- Embedding model card: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- Kaggle dataset discovery (inspect each item individually): https://www.kaggle.com/datasets

**Important:** The embedding model is pretrained and should be treated as a component you use, not a model you have trained. The role-fit scorer and mentor matcher are deliberately deterministic modules. The only model training candidate is a future skill-span extractor—and only if an evaluation shows it is worth the additional work.
