# Requirements & status

## What was asked

The system requirements, with a check for implemented (its requirements
land on diagrams that resolve to code) and one per test suite. The
grammar's design tier is the grammar itself — grammar.js, the scanner
and the node vocabulary — which argos cannot model yet, so the
implemented column reads from that gap, not from missing work.

<!-- folio: sreqs --junit test-results/junit.xml --junit_st test-results/junit-st.xml -->
| SREQ | Title | Implemented | UT | ST |
| --- | --- | --- | --- | --- |
| `SREQ-00001-1` | The project shall provide a tree-sitter grammar for the PlantUML language | ? | ~ | ~ |
| `SREQ-00002-1` | The grammar shall parse PlantUML class diagrams | ? | ✓ | ~ |
| `SREQ-00003-1` | The grammar shall parse unsupported constructs as raw pass-through nodes | ? | ✓ | ~ |
| `SREQ-00004-1` | The syntax tree shall preserve every byte of the source text | ? | ✗ | ✓ |
| `SREQ-00005-1` | The project shall version the syntax-tree node names under semantic versioning | ? | ✓ | ✗ |
| `SREQ-00006-1` | The grammar shall provide editor highlight queries for the supported subset | ? | ✓ | ✗ |
| `SREQ-00007-1` | The project shall publish the grammar as installable node and python packages | ? | ~ | ✗ |
| `SREQ-00008-1` | The grammar shall parse PlantUML sequence diagrams | ? | ✓ | ~ |
| `SREQ-00009-1` | The grammar shall parse PlantUML activity diagrams in the new syntax | ? | ✓ | ✓ |
<!-- /folio -->

## Total traceability

<!-- folio: matrix --junit test-results/junit.xml --junit_st test-results/junit-st.xml -->
| SREQ | Requirements | Diagrams | Classes | UT | ST | Verifications |
| --- | --- | --- | --- | --- | --- | --- |
| `SREQ-00001-1` | `REQ-00001-1` | `CL_Envelope`<br>`HLD_TreeSitterPlantuml` | `Envelope` | 1 | 0 | `VER-00003-1` |
| `SREQ-00002-1` | `REQ-00002-2`<br>`REQ-00003-3`<br>`REQ-00004-1`<br>`REQ-00005-3`<br>`REQ-00006-1`<br>`REQ-00010-4`<br>`REQ-00011-2`<br>`REQ-00013-1`<br>`REQ-00014-1`<br>`REQ-00020-1`<br>`REQ-00021-1`<br>`REQ-00022-1`<br>`REQ-00023-1`<br>`REQ-00028-2` | `CL_ClassChapter`<br>`CL_Envelope`<br>`CL_Grouping`<br>`CL_Members`<br>`CL_Notes`<br>`CL_Relations` | `ClassChapter`<br>`Envelope`<br>`Grouping`<br>`Members`<br>`Notes`<br>`Relations` | 11 | 1 | `VER-00004-1`<br>`VER-00005-2`<br>`VER-00006-1`<br>`VER-00007-1`<br>`VER-00008-1`<br>`VER-00010-1`<br>`VER-00011-1`<br>`VER-00012-1`<br>`VER-00013-1`<br>`VER-00019-1`<br>`VER-00020-1`<br>`VER-00021-1`<br>`VER-00022-1`<br>`VER-00029-2` |
| `SREQ-00003-1` | `REQ-00007-1`<br>`REQ-00012-2` | `CL_Frontier` | `Frontier` | 2 | 1 | `VER-00009-1`<br>`VER-00023-1`<br>`VER-00024-1` |
| `SREQ-00004-1` | `REQ-00008-1` | `CL_TreeSitterPlantuml` | `bindings.python`<br>`grammar.activity`<br>`grammar.classes`<br>`grammar.envelope`<br>`grammar.frontier`<br>`grammar.grouping`<br>`grammar.members`<br>`grammar.notes`<br>`grammar.queries`<br>`grammar.relations`<br>`grammar.sequence` | 0 | 1 | `VER-00001-1` |
| `SREQ-00005-1` | `REQ-00009-1`<br>`REQ-00027-1` | `CL_Queries` | `Queries` | 2 | 0 | `VER-00002-2`<br>`VER-00028-1` |
| `SREQ-00006-1` | `REQ-00009-1` | `CL_Queries` | `Queries` | 2 | 0 | `VER-00002-2` |
| `SREQ-00007-1` | `REQ-00015-1`<br>`REQ-00016-1` | `CL_Packaging` | `Packaging` | 1 | 0 | `VER-00014-1`<br>`VER-00015-1` |
| `SREQ-00008-1` | `REQ-00017-1`<br>`REQ-00018-1`<br>`REQ-00019-1`<br>`REQ-00024-1`<br>`REQ-00025-1` | `CL_Relations`<br>`CL_SequenceChapter` | `Relations`<br>`SequenceChapter` | 4 | 1 | `VER-00016-1`<br>`VER-00017-1`<br>`VER-00018-1`<br>`VER-00025-1`<br>`VER-00026-1` |
| `SREQ-00009-1` | `REQ-00026-2` | `CL_ActivityChapter` | `ActivityChapter` | 1 | 2 | `VER-00027-1` |
<!-- /folio -->
