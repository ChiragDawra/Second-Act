# Python extractor prototype (reference only)

`resume_skill_test.py` is the first prototype: PyMuPDF/python-docx text extraction, a hand-written skill dictionary,
and optional MiniLM semantic suggestions. It is kept for reference and is **not used by the product**.

What the evaluation showed about this approach (see `docs/DELHI_NCR_SKILL_EXTRACTOR_PLAN.md`):

- Dictionary matching with no context treats every future goal and every "no experience" statement as a current skill
  (14 of 14 future goals leaked on the evaluation set). The production extractor classifies each sentence first.
- It has no section handling, so employer names and surnames can match skills ("Jenkins", "Swift").
- Semantic similarity is a retrieval signal, not evidence. If it is added back, keep its output `inferred` and
  `pending`, require a quote from the resume, and never let it replace a rule match.

Run it only on resumes you are allowed to process. Its output file contains extracted resume content and is git-ignored.
