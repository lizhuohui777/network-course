# Network course maintenance

The directory containing this file is the project root. Resolve paths relative to it so clones on another computer work.

1. Before course work, read `docs/LEARNING_CONTEXT.md`, `docs/REQUIREMENTS.md` and `课程维护约定.md`. User instructions override the initial pilot workflow: all twelve lessons are now complete and reviewable. Browser records are not automatically available in project files; use only learner-provided records or reports.
2. For a course question, read the relevant lesson and its curriculum mappings, explain the question first, then offer a concrete HTML update when useful. Wait for agreement before a new clarification update; direct user requests for edits already authorize that work.
3. Preserve substantive beginner explanations, diagrams, worked examples and meaningful technical qualifications. Label source associations “网站知识点” at the day and topic levels, including feedback and exports. Keep authoring rationale, pacing reminders and coverage audits out of learner prose; follow the attention rules in the maintenance agreement.
4. Keep topic IDs, answer keys and published lesson mappings stable. `curriculum.json` controls the default entry via `default_mode`: currently `review`, so both HTML entries show all twelve days using review records. Switch it to `study` only after the user finishes checking and requests sequential learning. Validate each topic-source assignment and all twelve lessons with `build.py`. All 47 topics have mechanism examples: `interactive-examples.json` is authoritative for the 46 shared examples; keep the approved ARP diagram in lesson 2. Preserve standard terminology, scenario conditions and numeric meaning when changing data or `diagrams.js`.
5. Edit authoritative lesson/template/code sources, rebuild both pages and run relevant checks. Never infer mastery, elapsed study time, start dates or quiz success from visits. Never commit personal learning records, local archives, screenshots or credentials.

Use only the current record schema. The user explicitly requested removal of old development-record compatibility. Maintain portable code, no account or network service dependency for learning. GPT answer context is copied/exported by the learner; the HTML does not send chat messages or synchronize accounts.

Public GitHub publication for this delivery is authorized to `lizhuohui777/network-course`. Scan tracked files and Git history for secrets before pushing; never expose credentials in output. Do not alter unrelated repositories or stored credentials. No destructive Git history rewrite.

Communicate in Chinese by default, lead with the outcome, keep multi-step actions numbered and avoid implementation detail unless useful. Use explicit review findings and appropriate tests to drive fixes, not speculative refactoring.
