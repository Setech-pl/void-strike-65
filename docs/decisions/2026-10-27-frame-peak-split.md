# Natural capital-entry fence correction — owner decision, 2026-10-27

The owner approved continuing the [worst-frame audit](../audits/2026-10-27-frame-peak-split.md)
from `299d800` on `codex/frame-peak-split`.

Removing the missed fence at natural SPACE → capital entry is an authorized
bug fix: publication may occur one physical PAL frame earlier than main.
No other physical presentation change is authorized. Logical state remains
identical per iteration. Physical PAL tokens may differ only as a consequence
of that removed frame, with every difference listed in the measured evidence.

Implement the zero-byte pre-wait shot/hit scan (A), then four disjoint 30-byte
C lookup-clear stripes (B). C retains initialization and phase decisions.
Only if A+B fails a gate may the bounded ASM clear executor (C) be used;
report B's measured results either way.

Native gate coverage permanently includes the twelve direct L2 routes plus
natural campaign EASY/MEDIUM flight/contact and HARD brake/contact, each
through capital exit and boss entry. Every measured iteration must be at most
31,500 wall cycles; hard gate 32,568, zero missed fences/VBI/DLI/phase/clock/L2
anomalies, capital peak at most 29,756 and boss entry at most 350 host frames.
All native logical-state streams and 720 SPACE fixtures must match main.
No SPACE iteration may become more expensive at the same logical index.

L2's usable limit remains 1,536 B; `$1F00–$1FFF` is protected. Keep the eight
pre-existing level-summary/Light failures unchanged, with no ledger edits.
Use focused tests, not the full suite. Deliver a committed OWNER-SMOKE
CANDIDATE; feature acceptance still requires owner play. No push or merge.
