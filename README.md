## Specification Workspace Guide

This repository uses a spec-driven workflow to plan, design, and implement features. Use this README as your entry point to navigate documentation and understand how to work with the specs efficiently.

### How to Use This Workspace
- **Start here**: Read the document map below to find what you need fast.
- **Do not duplicate content**: Each document owns a specific purpose; link to it rather than copying text.
- **Follow the workflow**: Requirements → Design → Tasks → Implementation (tracked in `tasks.md` and the dashboard).
- **Use the dashboard**: The Spec Workflow Dashboard provides real-time status and approvals.

### Quick Links
- Project root app: `src/`, backend worker: `backend/`, Cloudflare Pages output: `dist/`
- Spec Dashboard: `http://localhost:5000` (see “Using the Dashboard” below)

---

### Document Map (Specs)
All specification documents live under `.spec-workflow/specs/`. The “project-documentation” spec contains general documentation for this codebase:

- `.spec-workflow/specs/project-documentation/requirements.md`
  - Purpose: High-level goals and scope for documentation and developer experience.
- `.spec-workflow/specs/project-documentation/design.md`
  - Purpose: Information architecture and organization strategy for the docs.
- `.spec-workflow/specs/project-documentation/tasks.md`
  - Purpose: Actionable tasks derived from design; source of truth for progress.
- `.spec-workflow/specs/project-documentation/gap-analysis.md`
  - Purpose: Identifies missing pieces, risks, and follow-ups in documentation.
- `.spec-workflow/specs/project-documentation/coding-standards-quick-reference.md`
  - Purpose: Concise coding standards reference used across the project.

There is also a top-level spec collection file:
- `.spec-workflow/specs/requirements.md`
  - Purpose: Consolidated or cross-spec requirements when applicable.

Note: This README links to authoritative sources; consult each file directly for details.

---

### Relationships Between Documents
- **requirements.md → design.md → tasks.md**: Flow of specificity.
  - Requirements define “what and why”.
  - Design specifies “how”.
  - Tasks enumerate “what exactly to build” (atomic, traceable to design/requirements).
- **gap-analysis.md**: Cross-cuts the above to highlight missing or risky areas and propose remediation tasks.
- **coding-standards-quick-reference.md**: Applies project-wide; referenced by both design and tasks to ensure consistent implementation quality.

This structure prevents duplication:
- Keep motivation and acceptance criteria in requirements.
- Keep technical decisions, diagrams, and architecture in design.
- Keep implementation checklists and status in tasks.
- Use gap analysis to record issues and decisions that affect multiple docs.

---

### Using the Dashboard
- Start the dashboard:
  - `npm run spec:dashboard` (runs at `http://localhost:5000`)
  - In a separate terminal: `npm run spec:server`
- Verify the dashboard shows the project (e.g., “system-new”) and status “已连接”.
- Use the dashboard approvals to progress documents through phases. Verbal approval is not accepted; approvals must be recorded in the dashboard.

---

### Authoring Guidelines (Do Not Duplicate Content)
- Link to the authoritative document instead of copying sections.
- When adding content:
  - Requirements: user stories, constraints, acceptance criteria.
  - Design: structure, flows, APIs, data, component boundaries, trade-offs.
  - Tasks: atomic, testable items with clear outcomes; keep status updated.
  - Gap Analysis: findings, assumptions, risks, decisions, remediation tasks.
- Keep sections short and skimmable; prefer links to deep context.

---

### Implementation Workflow (Reference)
1. Author or update `requirements.md`, request approval in the dashboard.
2. After approval, create/update `design.md`, request approval.
3. After approval, create/update `tasks.md`, request approval.
4. When implementing:
   - Mark the task as in-progress `[-]` in `tasks.md`.
   - Implement code following the design and coding standards.
   - Log details with the implementation logger (artifacts: endpoints, components, utilities, integrations).
   - Mark the task as completed `[x]` in `tasks.md`.

---

### Where to Find Things
- Frontend app: `src/` (Vue 3)
- Backend Cloudflare Worker: `backend/`
- E2E tests (Playwright): `tests/e2e/`
- Deployed static assets (Pages): `dist/`
- Cloudflare Functions (Pages Functions): `functions/`

If you are unsure which document to edit, start from the Document Map above; each file includes its purpose to keep the system organized and avoid duplication.


