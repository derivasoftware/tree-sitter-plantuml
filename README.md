# tree-sitter-plantuml

A [tree-sitter](https://tree-sitter.github.io/) grammar for the
[PlantUML](https://plantuml.com/) language.

This is a standalone project: the grammar is a general-purpose parser for any
tree-sitter consumer — editors, formatters, linters, documentation tooling.
It carries no coupling to any specific downstream.

## Scope and roadmap

PlantUML has no formal grammar and an enormous surface. This project covers it
incrementally, one diagram type at a time, behind an explicit frontier policy:

- **v0.1 (current)** — the `@startuml`/`@enduml` envelope, line and block
  comments, and the class-diagram core: `class` / `abstract class` /
  `interface` / `enum` declarations (quoted names, aliases, generics,
  stereotypes), members with visibility and `{static}`/`{abstract}` modifiers,
  the relation operators (inheritance, realization, composition, aggregation,
  dependency, association) with cardinalities and labels, `package` /
  `namespace` / `together` blocks, structured notes (positional, targeted,
  on-link, block and floating forms), and `hide`/`show`/`remove`/`restore`
  display directives. `legend`/`header`/`footer` and braced `skinparam`
  blocks pass through the raw frontier safely.
- **next** — remaining class-diagram constructs (member-group separators,
  `extends`/`implements`, colors and relation styles), then sequence
  diagrams, then activity diagrams (new syntax only).

**Frontier policy**: any statement outside the supported subset parses as a
`raw_line` (or `raw_block` for multi-line notes) instead of an `ERROR` node,
and must survive a round-trip byte-identical. Consumers can rely on every
input producing a usable tree. Known limitation: a truly unknown
identifier-headed statement can still produce an `ERROR`; hardening this
frontier is on the roadmap.

**Node names are public API.** The node vocabulary (`class_declaration`,
`relation`, `member`, …) is versioned under semver; renames are breaking
changes.

## Development

```bash
npm install        # installs tree-sitter-cli
npm test           # tree-sitter generate && tree-sitter test
```

Corpus tests live in `test/corpus/`. Every grammar change ships with corpus
coverage.

## Governance

This repository is an [argos](https://gitlab.semantiqa.dev/deriva/argos/argos)
NA project: input requirements live in `input/` (SREQ artefacts), local
requirements and verifications in `requirements/` and `verifications/`. See
`CLAUDE.md` for the working rules.
