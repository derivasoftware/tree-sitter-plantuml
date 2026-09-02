# Repo quality

The repository's inventory and health metrics, computed from the model
and the last test runs. Absent evidence reads `?`, never a guess. Line
coverage reads `n/a` by design: the executable code is a generated
parser (`src/parser.c`) and `grammar.js` compiles rather than runs, so
line coverage would measure the generator, not this repo. The coverage
metric a grammar can honestly claim is standard conformance, below.

<!-- folio: quality --junit test-results/junit.xml --junit_st test-results/junit-st.xml -->
### Inventory

| Artefact | Count |
| --- | --- |
| System requirements | 9 |
| Requirements | 28 |
| Verifications | 29 |
| Constraints | 0 |
| Design diagrams | 13 |
| Code classes | 0 |
| Free functions | 0 |
| Test cases | 25 |

### Metrics

| Metric | Value |
| --- | --- |
| Source files | 0 |
| Source lines | 0 |
| Documentation files | 7 |
| Documentation lines (authored) | 321 |
| Tests executed (UT) | 24 |
| Tests executed (ST) | 235 |
| UT line coverage | ? |
| ST line coverage | ? |
| argos diagnostics | 0 |
<!-- /folio -->

### Standard conformance

Line coverage's replacement. The conformance suite
(`tests/test_standard_coverage.py`) asserts, construct by construct,
that the corpus derived from the PlantUML Language Reference parses
without ERROR and lands on the intended node; the losslessness sweep
(`tests/test_round_trip.py`) round-trips every corpus and example input
with full token coverage. The corpus carries every documented construct
at least once; the table counts the suite's explicit one-by-one
assertions (the README's Scope figures count the reference's construct
inventory instead).

| Chapter | Constructs asserted | Structural node | Raw pass-through |
| --- | --- | --- | --- |
| Class | 49 | 35 | 14 |
| Sequence | 30 | 17 | 13 |
| Activity | 28 | 5 | 23 |

Raw is a verified outcome, not a miss: the assertion pins the construct
to `raw_line`, proving it survives lossless instead of erroring.
