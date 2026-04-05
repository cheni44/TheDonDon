# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This is a fresh project scaffold using **OpenSpec** for structured feature development. No application code exists yet — the repo contains only the OpenSpec workflow infrastructure. Application code and build commands will be added as development begins.

## OpenSpec Workflow

This project uses the OpenSpec "propose → apply → archive" lifecycle. Every feature or fix is a **change** with its own directory under `openspec/changes/<change-name>/`. The schema type is `spec-driven` (see `openspec/config.yaml`).

### Lifecycle Commands

| Phase | Skill | Purpose |
|-------|-------|---------|
| Explore | `/opsx:explore` | Think through problems — no implementation |
| Propose | `/opsx:propose` | Create change artifacts (proposal, design, specs, tasks) |
| Apply | `/opsx:apply-change` | Implement tasks from an active change |
| Archive | `/opsx:archive-change` | Complete a change, sync specs, move to archive |

### Artifact Structure per Change

```
openspec/changes/<change-name>/
├── proposal.md     # Problem statement and why
├── design.md       # Technical approach (depends on specs)
├── specs/          # Delta capability specs for this change
└── tasks.md        # Implementation checklist (depends on design)
```

Artifacts have dependencies — tasks depend on design, design depends on specs. The OpenSpec CLI tracks this graph; always run the skill to check readiness before creating artifacts manually.

### Archive Format

Completed changes are moved to `openspec/changes/archive/YYYY-MM-DD-<name>/`. Delta specs in `changes/<name>/specs/` are synced back to the main `openspec/specs/<capability>/` on archive.

## Key Constraints (from Skill Definitions)

- **Explore mode**: Think only — never write code or create files during exploration.
- **Propose mode**: Create artifacts in dependency order; never skip ahead to tasks before specs/design.
- **Apply mode**: Implement tasks sequentially; pause and ask the user rather than guessing on blockers.
- **Archive mode**: Only archive when all tasks in `tasks.md` are checked off.
