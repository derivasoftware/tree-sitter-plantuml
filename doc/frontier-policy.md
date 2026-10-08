# Frontier policy — raw, never ERROR

PlantUML has no formal grammar; its de-facto standard is the Language
Reference plus the Java implementation. This grammar therefore commits
to an explicit **frontier**: everything inside the supported subset
parses into structural nodes; everything outside parses as `raw_line`
(or `raw_block` for multi-line bodies) — **never** as an `ERROR` node —
and survives a round-trip byte-identical.

Consumers can rely on two invariants (both enforced by CI on every
change):

1. **Error-freeness** over the supported frontier: zero `ERROR`/
   `MISSING` nodes.
2. **Losslessness**: token spans cover every non-whitespace byte, so
   `tree + inter-token whitespace == input`.

## How a line reaches raw

Four routes:

1. A first character that cannot start any supported token
   (`!directives`, separators, …).
2. A line headed by a known-but-unsupported keyword
   (`skinparam`, `title`, `circle`, `json`, `autonumber`, `autoactivate`, …).
   The keyword has to end where a word ends: nearly all of them head a line
   that carries something after them, so they demand a space, and only the
   few that are a whole statement on their own (`autonumber`, `allowmixing`,
   `allow_mixing`) match bare. Without that separator the keyword wins
   against any longer name that begins with it — these tokens carry explicit
   precedence, and precedence beats match length — so `setpoint --> Sum`
   parses as `point --> Sum`, and `nodeA` turns a class diagram into a
   deployment one.
3. Block heads (`legend`/`header`/`footer`/braced `skinparam`) open a
   `raw_block` whose body lines are all raw.
4. **The fallback** (`src/scanner.c`, REQ-00012-2): an external scanner
   claims an identifier-headed line whose head is not a statement
   keyword and whose continuation — looking past qualifiers (`[k]`)
   and cardinalities (`"1"/role`) — cannot open a relation or colon
   member. When in doubt it declines, so structural rules keep their
   exact behaviour; an error-recovery sentinel keeps it silent during
   recovery. Keyword-table drift fails loudly: a keyword added to
   `grammar.js` but missing from the C table turns its construct raw
   and its corpus test red.

The state-diagram chapter parses without a single ERROR as of 0.14.0, which
is what `examples/standard/state.puml` holds it to. As of 0.15.0 none of it is
raw either: of its 45 lines, 28 belong to a `state_block`, 10 are relations,
and the rest are notes and display directives. What stays opaque inside a
composite is the `--` that separates concurrent regions.

## Standard conformance

The class-diagram chapter of the reference is tracked as a
per-construct matrix (149 constructs, `examples/standard/*.puml`,
`tests/test_standard_coverage.py`): **125 structural, 24 deliberately
raw, 0 ERROR**. The deliberately-raw set is style/config surface
(`skinparam`, `set separator`, `page`, diagram-level direction), the
drawn-but-unmodeled shapes (`circle`, `diamond`) and `json` bodies.

The sequence and activity chapters follow the same matrix
(`examples/standard/sequence-*.puml`, `activity-*.puml`). Since 0.10.0
the sequence lifecycle verbs and the activity control flow are
structural (REQ-00029-1, REQ-00030-1); the legacy activity syntax
(`if "test" then`, `-->[cond]`) and block closers with no opener stay
raw by design, as do the braced `group`/`rectangle`/`card` drawing
blocks.

## Growing the frontier

Raw is not a dead end; it is the queue. A construct is promoted from
raw to structural when a consumer needs its content (evidence from a
real corpus), never speculatively. The promotion recipe is in
`development.md`.
