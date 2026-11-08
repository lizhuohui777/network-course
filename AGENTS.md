# Network course maintenance

The directory containing this file is the authoritative project root. The previous Codex project entry links here. Make changes in this root; keep one maintained copy. Resolve all course paths relative to this root so future Git clones remain portable.

When continuing this course, answering a learner's course question, creating a lesson, or changing HTML:

1. Read `课程维护约定.md`, `learner-state.json`, and the relevant lesson and curriculum entries. If the learner state is absent in a fresh checkout, copy `learner-state.example.json` to `learner-state.json`. Treat synced reference material in the original ChatGPT project as read-only. Local research archives are in `.local/research/`.
2. Explain the learner's current question first. Use one concrete example, a mechanism or diagram when helpful, and a short transfer question to check understanding. Treat the answer as unknown until the learner responds.
3. Identify a reusable gap: missing prerequisite, ambiguous explanation, mistaken analogy, missing example, factual error, or excessive workload. Proactively propose a specific HTML update naming the lesson and change. Wait for user agreement before applying a new clarification update. Existing authorization to build the initial curriculum and Day 1 remains valid.
4. Record only user-reported learning facts in `learner-state.json`. Keep suggested changes pending, distinct from approved and published changes. Never infer mastery, actual time, quiz success, or a start date from page visits or elapsed chat time. Follow the user's latest authorization for records and edits.
5. For an approved update, edit the single authoritative content location; adjust dependent lessons, the following day's review and relevant questions only when needed. Preserve stable IDs and browser progress. Update version and `CHANGELOG.md`, rebuild `index.html`, and verify the affected interactions. Report what now works.

The deliverable is local HTML. Publish or connect an external account only if the user requests it. Browser feedback is local until the learner copies or exports it into the chat; do not claim automatic chat-to-HTML or HTML-to-project synchronization.

Keep private learner records and local archives out of Git using `.gitignore`. Prepare local version history as needed; create a GitHub repository or push only when the user requests that step.

Communicate in Chinese by default. Lead with the outcome, number multi-step instructions, and give one small next action when work remains open. Keep explanations beginner-friendly and expand when asked.
