# Working in this repository

tree-sitter-plantuml is a standalone tree-sitter grammar for PlantUML — a
general-purpose parser for any tree-sitter consumer, with no coupling to any
downstream. Coverage grows one diagram type at a time (class diagrams first)
behind the raw_line/raw_block frontier policy; see README.md and the SREQ
artefacts in `input/` for scope and roadmap.

This project is **NA**.

## Governance tooling

The `argos` CLI is not installed in this repository (the project is not a
Python codebase). Run governance commands from an argos installation with
this repo as the workspace, e.g.:

```bash
source /home/sirope/code/argos/.venv/bin/activate
cd /home/sirope/code/tree-sitter-plantuml && argos context
```

Per-artefact `asil:` fields carry the canonical entity value `QM`
(REQ-00211-1: the per-artefact field does not accept NA); the project-level
NA lives in `argos.toml [project].asil`.

## Orient yourself — run this first

```bash
argos context              # artefact counts, next IDs, conventions, active diagnostics
argos tree                 # requirement DAG with status and ASIL
```

## Workflow rules

- **Every task starts with PROC-00014-2 (Start Task).** Read it before writing
  any artefact:
  ```bash
  argos get PROC-00014-2
  ```
- This project is **NA** (no ASIL declared). Agents may act as Owner
  under PROTOCOL-autonomous-loop (Autonomous Development Loop). The loop
  reads this signal from ``argos.toml [project].asil``.

- New artefacts start at DRAFT. Promote to APPROVED only after Owner sign-off.
- Commits: imperative summary of what was produced or changed.

## Definition of Done

```bash
npm test && ./.venv/bin/pytest tests/ -q && pre-commit run --all-files
```

`npm test` runs `tree-sitter generate && tree-sitter test` (corpus). The
pytest harness adds the per-feature corpus gates the VER artefacts link to,
the round-trip losslessness check (token-span coverage over corpus +
examples), and the highlight-query compilation check. Bootstrap the venv
once with `python3 -m venv .venv && ./.venv/bin/pip install pytest
tree-sitter`.

## Baseline diagnostics (not regressions)

- `W-REQ-NO-DESIGN` on every REQ: the CL_-class design methodology
  (argos-design-plantuml) does not map to a grammar.js repository. A
  design-artefact convention for grammar repos is open future work.
- `W-SREQ-NOT-DECOMPOSED` on SREQ-00009-1 (activity diagrams): roadmap
  SREQ, decomposed when its milestone starts.
