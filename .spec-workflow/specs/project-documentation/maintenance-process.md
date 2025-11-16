## Documentation Maintenance Process

Role: Project Manager specializing in documentation processes

Purpose
- Keep documentation accurate, trustworthy, and easy to update without adding heavy process overhead.
- Scope includes: product docs, internal ops docs (SOPs), API/backend docs, frontend UI docs, test docs (Playwright), and change logs within this repository.

Ownership
- Document Owners: Each area lists a primary and backup owner in the "Owners Register" (see Owners Register section).
- Responsibility: Owners ensure docs are current, reviews happen on time, and changes are merged/deployed.
- Anyone can propose changes via PR; Owners guard quality and cadence.

Update Frequency (Reasonable Defaults)
- Product user-facing docs: Monthly cadence or upon feature change (whichever comes first).
- Internal SOPs/runbooks: Quarterly cadence or upon process/tooling change.
- API/backend handlers/router docs: On change (PR-driven) + monthly sweep for drift.
- Frontend component docs (critical flows): On change (PR-driven) + quarterly sweep.
- Playwright tests and testing guide: On change (PR-driven) + after major release.
- Dashboards/spec workflow docs: On change (PR-driven).

Triggers for Update
- Code merged affecting behavior, UI, API contract, data model, or process.
- Incident/postmortem findings requiring SOP updates.
- Stakeholder feedback indicating docs are misleading or incomplete.
- Scheduled sweep date reached for the doc set (see Cadence Calendar).

Lightweight Maintenance Workflow (5 steps)
1) Propose
   - Create a short PR touching only relevant docs.
   - Use clear title prefixed with docs: and link related issues/PRs.
2) Review
   - Request review from the relevant Document Owner(s).
   - SLA: 2 business days for initial response, 5 business days to merge or request changes.
3) Validate
   - Ensure examples compile or commands run where applicable.
   - Verify links with link checker and run markdown lint.
4) Approve & Merge
   - At least one Owner approval required.
   - Squash merge preferred to keep linear history.
5) Publish
   - If content is included in build artifacts, ensure deployment pipeline runs.
   - Update Changelog (docs) section if user-facing.

Review Procedures
- Roles
  - Author: prepares change and PR checklist.
  - Reviewer (Owner/backup): validates correctness, clarity, consistency.
  - Optional SME: domain-specific sign-off for sensitive topics (security, finance).
- What to check
  - Accuracy: matches current behavior/API/UI.
  - Clarity: simple phrasing, task-focused steps, screenshots if needed.
  - Consistency: file naming, style, terminology.
  - Testability: steps reproducible; examples runnable.
  - Backwards compatibility: highlight breaking changes.
- SLAs
  - Acknowledge within 2 business days; merge or detailed feedback within 5 business days.
- When to request SME
  - Security/data handling, financial calculations, regulatory content, or public communications.

Version Control Rules (Practical)
- Repository & Location
  - All docs live in this repo close to code when possible (e.g., API docs near handlers).
  - Cross-cutting and process docs live under .spec-workflow/specs/project-documentation/.
- Branching
  - Use short-lived branches from main: docs/<topic-or-issue-id>.
  - Always open PRs; no direct commits to main.
- Commit Messages (Conventional Commits)
  - docs: Update API contract for payroll endpoints
  - docs: add SOP for client onboarding
  - docs: fix broken links in clients services page
- PR Titles
  - docs: concise purpose (include affected area and ticket/PR link if applicable)
- File Naming
  - kebab-case for filenames; append -guide, -reference, or -sop when useful.
- Versioning & Changelog
  - Version docs implicitly with repository tags/releases.
  - Maintain a docs section in CHANGELOG.md; for major user-facing changes, add an entry.
- Backports
  - If hotfix changes apply to previous versions, cherry-pick with docs: backport in title.

Quality Gates (Automation)
- Markdown lint (style, headings, lists).
- Link checker for internal and external links.
- Optional spelling dictionary for product terms.
- PR Checklist (paste into description)
  - [ ] Aligned with current behavior/UI/API
  - [ ] All links valid; images committed
  - [ ] Examples/commands verified
  - [ ] Owners/SME review requested (if needed)
  - [ ] Changelog updated (if user-facing)

Cadence Calendar (Lightweight)
- Monthly: product docs, API contract sweep
- Quarterly: SOPs, critical front-end flows
- After major release: test docs and guides
- Owners maintain a simple calendar entry/reminder; combine sweeps where possible to reduce overhead.

Owners Register
- Product docs: Primary PM (this role), Backup: Lead Designer
- API/backend docs: Primary Backend Lead, Backup: Senior Backend Engineer
- Frontend critical flows: Primary Frontend Lead, Backup: Senior Frontend Engineer
- SOPs/runbooks: Primary Operations Lead, Backup: Team Lead rotating
- Testing docs: Primary QA Lead, Backup: Senior QA Engineer

Exceptions
- Emergency changes may be merged by any Lead with a follow-up docs PR within 3 business days.
- If SLAs cannot be met due to release pressure, document the reason in the PR and schedule a catch-up window the following week.

Sustainability Notes
- Prefer small, frequent updates over large rewrites.
- Keep processes discoverable and enforceable via PR templates and automated checks.
- Avoid duplicating content; link to single sources of truth.


