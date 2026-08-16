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
  stereotypes, `extends`/`implements` clauses, trailing colors), members
  with visibility and `{static}`/`{abstract}` modifiers plus group
  separator lines (`--`, `..`, `==`, `__ titled __`),
  the relation operators (inheritance, realization, composition, aggregation,
  dependency, association) with cardinalities and labels, `package` /
  `namespace` / `together` blocks, structured notes (positional, targeted,
  on-link, block and floating forms), and `hide`/`show`/`remove`/`restore`
  display directives. `legend`/`header`/`footer` and braced `skinparam`
  blocks pass through the raw frontier safely.
- **v0.2 (current)** — the sequence-diagram core, evidence-scoped from a
  real 84-diagram corpus: participant declarations (all eight kinds,
  quoted names, aliases), `alt`/`opt`/`loop`/`par`/`break`/`critical`/
  `group` frames with `else` clauses, and `==` section dividers. Arrow
  lines (`A -> B : msg`) parse as the generic `relation` node — whether
  that is an association or a message is diagram context the consumer
  holds. Lifecycle verbs (`activate`, `return`, `ref`…) stay on the raw
  frontier until evidence demands structure.
- **v0.4 (current)** — standard conformance for class diagrams, driven
  by a per-construct matrix of plantuml.com/class-diagram (149
  constructs, `examples/standard/`): the extended entity kinds
  (`annotation`, `exception`, `metaclass`, `protocol`, `struct`,
  `record`, `dataclass` → `entity_declaration`), single-line colon
  members (`Object : equals()`), decorated relation operators (style
  tags `-[#red,dashed,thickness=2]->`, shorthands `-l->`, lollipops
  `()-`/`-()`, hierarchy `+--`, qualifiers `[customerId]`, role-slash
  cardinalities, inline colors, `Entity::member` endpoints), `$tag`
  markers and `$`-prefixed names, `{field}`/`{method}`/`{classifier}`
  modifiers, `~` package-private members (GLR-disambiguated from C++
  destructors), and package colors. Result: 125/149 structural, 24/149
  raw, **0 ERROR**.
- **next** — activity diagrams (new syntax only), then the frontier
  hardening for identifier-headed unknowns (REQ-00012-1).

**Frontier policy**: any statement outside the supported subset parses as a
`raw_line` (or `raw_block` for multi-line notes) instead of an `ERROR` node,
and must survive a round-trip byte-identical. Consumers can rely on every
input producing a usable tree. Every construct documented by the class-diagram
reference parses without `ERROR` (see `tests/test_standard_coverage.py`).
Known limitation: a truly unknown identifier-headed statement outside the
reference can still produce an `ERROR`; hardening this frontier is on the
roadmap (REQ-00012-1).

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

To evaluate against a wild corpus of real diagrams:

```bash
.venv/bin/python scripts/eval_wild_corpus.py <root>...
```

The current grammar parses the full argos design corpus (6&#8239;192 `.puml`
files) 100% ERROR-free and 100% lossless.

## Governance

This repository is an [argos](https://gitlab.semantiqa.dev/deriva/argos/argos)
NA project: input requirements live in `input/` (SREQ artefacts), local
requirements and verifications in `requirements/` and `verifications/`. See
`CLAUDE.md` for the working rules.
