# tree-sitter-plantuml

<!-- folio: colophon --project tree-sitter-plantuml --junit test-results/junit.xml --junit_st test-results/junit-st.xml -->
![powered by: argos](https://img.shields.io/badge/powered%20by-argos-1f6feb) ![verified: 100%](https://img.shields.io/badge/verified-100%25-2ea44f) ![tests: 100%](https://img.shields.io/badge/tests-100%25-2ea44f) ![UT: n/a](https://img.shields.io/badge/UT-n%2Fa-lightgrey) ![ST: n/a](https://img.shields.io/badge/ST-n%2Fa-lightgrey) ![diagnostics: 0](https://img.shields.io/badge/diagnostics-0-2ea44f)

> **tree-sitter-plantuml** is powered by **argos**. **folio** generates this documentation from the repository's model: 28 requirements · 29 verifications · 0 constraints. Quality: 100% verified · 100% tests passing.
<!-- /folio -->

A [tree-sitter](https://tree-sitter.github.io/) grammar for the
[PlantUML](https://plantuml.com/) language. Standalone and consumer-neutral:
editors, formatters, linters and documentation tooling all parse through it.
Root of the `deriva/plantuml` family: grammar → formatter → LSP → editor.

The structural guarantee: **never ERROR**. Statements the grammar knows
become structured nodes; anything else (deployment syntax, mindmaps, future
PlantUML) passes through lossless as `raw_line` via the frontier fallback.
Coverage is standard-driven: per-construct matrices of plantuml.com (class
125/149 structural, sequence 70/111, activity at the raw tier), all at zero
ERROR.

## Install

**Neovim**: [plantuml.nvim](https://github.com/derivasoftware/plantuml.nvim)
builds the pinned grammar for you; nothing else to do.

**Python** (the binding the LSP uses), straight from git. Generated
from the manifest and the latest tag:

<!-- folio: install -->
```bash
pip install git+https://github.com/derivasoftware/tree-sitter-plantuml.git@v0.9.5
```

Or from a clone: `git clone https://github.com/derivasoftware/tree-sitter-plantuml && pip install ./tree-sitter-plantuml`.
<!-- /folio -->

**C or anything else**: compile `src/parser.c` and `src/scanner.c` from a
clone (`cc -shared -fPIC -Isrc src/parser.c src/scanner.c`).

## Use cases

**Parse from Python**:

```python
from tree_sitter import Language, Parser
import tree_sitter_plantuml

parser = Parser(Language(tree_sitter_plantuml.language()))
tree = parser.parse(b"@startuml\nclass Cafetera\n@enduml\n")
```

**Highlight, fold and indent** in any tree-sitter editor; the `queries/`
directory ships alongside the parser.

**Build tooling on the node vocabulary**: `src/node-types.json` is the
machine-readable contract (120 node types, semver-governed); see
[doc/node-vocabulary.md](doc/node-vocabulary.md).

## Scope

The family covers a standard-driven subset of PlantUML, never the whole
language. Class diagrams: 125 of 149 standard constructs structural;
sequence: 70 of 111, with the lifecycle verbs (activate, ref, box,
delays) still raw; activity: actions and swimlanes structural, control
flow raw. Everything else (deployment, components, state, mindmaps,
gantt) parses lossless as raw lines, never an ERROR, but gets no
structure. The conformance matrices are tests
(`tests/test_standard_coverage.py`) and are the source of these numbers.

## Documentation

- [Node vocabulary](doc/node-vocabulary.md): the grammar's public API
- [Architecture](doc/architecture.md): the design tier, rendered from source
- [Frontier policy](doc/frontier-policy.md): what becomes structure, what stays raw, and why
- [Development](doc/development.md): corpus tests, conformance matrices, releasing
- [Requirements & status](doc/requirements.md): what was asked and the traceability matrix
- [Repo quality](doc/quality.md): artefact inventory and health metrics

*Not affiliated with or endorsed by the PlantUML project.*
