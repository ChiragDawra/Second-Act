# Gold label revisions

Gold labels were written from the source text before the extractor existed (162 synthetic rows,
40 private rows). After the first extractor run, rows were added or changed only where the run
exposed a label that was missing for a claim the resume really makes, or an inconsistency with
the labelling policy. Every change is listed here so results are not silently flattered.

| Date | Resume | Skill | Change | Reason |
|---|---|---|---|---|
| 2026-10-18 | resume_01 | requirements-documentation | added `ambiguous` | "functional specification documents" are read to build the traceability matrix, not written. Same policy as resume_02 BRDs. |
| 2026-10-18 | resume_03 | test-case-design | added `explicit_current` | "authoring test scenarios" during UAT is a real current claim that had no label. |
| 2026-10-18 | resume_04 | test-documentation | added `ambiguous` | "trace matrices" appear in a business-analysis sentence; the alias belongs to a QA skill. |

Labelling policy: future goal beats negation, and negation beats coursework when several signals hit
one skill. Target-role statements ("transitioning into Help Desk") and employer names are not
evidence. Lapsed credentials are `ambiguous`.
