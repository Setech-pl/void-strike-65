# Main-menu twinkling stars, alternative A — measured against the boot block

Date: 2026-09-22. Branch `feat/menu-stars-resident`, from `main` at `73108dc`
(the capital hull set v2 FULL MASS art and its regenerated runtime evidence).
Status: **RESOLVED — the owner spent the sector; `A′` shipped 2026-09-23.**
The blocker below stands as the measurement that produced the decision; §8
records the decision and what was delivered.

This supersedes the cost model in
[menu-stars-resident-space.md](menu-stars-resident-space.md) §4, alternative A,
on one point only: **A does not cost "0 new boot sectors"**. Everything else in
that document — the layout, the display-list change, the glyph scheme, the
colour compromise, the per-frame cost — still stands and is not re-derived here.

No production source changed on this branch. `dist/void-strike-65.xex` is
still `9ea9dbfa870d511b154132b3be7906fe4d52b916480278037a7c924460c953b9` and the
worktree is clean.

---

## 1. Why the earlier costing was wrong

`menu-stars-resident-space.md` costed the feature in **address space** — the
free tails of `STARFIELD`, `PICKUP_CODE` and the splash slack, 259 B between
them. That is the right currency for "does it fit in RAM", and A does fit in
RAM. It is the wrong currency for "does it cost a boot sector".

What a boot sector actually costs is **packed bytes in the DFMC initial block**,
which is `residentPrefix + BOOT_STAGE2 + packed MAIN suffix + packed STARFIELD +
A2_KERNEL + packed ENTITY_CODE + the splash blob + the trailer`
(`scripts/build.mjs`, `initialContentParts`). Three consequences the address
model does not see:

* A reserved tail costs **nothing** while it is empty. `LZ-10/5` packs a
  114-byte zero run to 11 bytes and a 56-byte zero run to 7 (MEASURED). Filling
  it with star coordinates, glyph bytes and phases — which are incompressible —
  costs packed bytes almost one for one.
* `LOADER_SPLASH_CODE_SLACK` is therefore worth **~0 transport bytes**, not
  56. `MAIN` is `fill = yes` over a fixed `$2000`, so deleting the slack only
  moves the same 56 zero bytes to the tail of the region. Spending that window
  buys address space and nothing else — and it still pays the cycle price its
  own comment records (worst fence margin 1,985 → 1,959 when it was last
  closed). It was not spent.
* `PICKUP_CODE` rides an **extension** chunk, not the initial block, so bytes
  put there cost extension sectors instead. It holds 89 B, against a feature
  footprint of roughly 250 B, so it cannot absorb the feature on its own.

## 2. MEASURED — the initial block is exactly full at `73108dc`

`sectors = ceil((initialContentBytes + 12) / 128)`, where 12 is
`INITIAL_ENVELOPE_MIN_BYTES` (`scripts/chunk-loader.mjs`).

| | `initialContentBytes` | envelope | boot sectors |
| --- | ---: | ---: | ---: |
| `main` `73108dc` | **13,556** | **12** | **106** |

13,556 + 12 = 13,568 = 106 × 128 **exactly**. The envelope is at its documented
minimum, so the spare capacity inside 106 sectors is **0 bytes**. The hull v2
merge's 107 → 106 saving did not leave a usable remainder; it landed the block
on the sector boundary.

The ceiling `validateInitialBlockCapacity` enforces is still 107 sectors
(13,696 B), i.e. **128 B** of headroom above `main` — one sector's worth,
and taking any of it moves the boot sector count.

## 3. MEASURED — what alternative A costs

Alternative A was built in full on this branch (the parked
`feat/menu-stars-a` work applies to `73108dc` with `git apply --3way`, verified
this session) and then reverted. Mockup A, 31 stars, the seven converted
display-list lines, no chunk-loader change:

| Stream | raw before | raw after | packed before | packed after | initial-block delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| `MAIN` resident suffix | 7,743 | 7,743 | 6,592 | 6,592 | **0** |
| `STARFIELD` | 1,990 | 2,074 | 1,701 | 1,785 | **+84** |
| `ENTITY_CODE` | 3,161 | 3,161 | 2,724 | 2,801 | **+77** |
| | | | | | **+161** |

Two of those rows deserve reading twice.

* `MAIN` does not move. The frontend loop change swaps one `jsr` target, so the
  resident image keeps its size (7,743 raw, 6,592 packed) and **no pinned
  `CODE`/`RODATA` address moves**; MEASURED, 16 bytes of 7,743 differ — the
  changed `jsr` operand plus the boot operands the build patches in when the
  packed `STARFIELD` stream changes length. The address churn alternative A
  warned about does **not** occur, because the splash slack was not spent, and
  the pinned-address tests and the cycle baseline are therefore untouched.
* `ENTITY_CODE` does not grow **in address space** at all: the 14 display-list
  bytes and the two one-shot routines fit inside alignment padding that was
  already there. They still cost **77 packed bytes**, because the padding they
  replaced was zeros and they are code. This is exactly the trap in §1.

Result: `initialContentBytes` 13,556 → **13,717**, boot sectors **106 → 108**.
That is +2 over `main` and +1 over the ceiling the tree already allows.

## 4. MEASURED — how far it has to be cut

Three builds, everything else held constant, only `menuStars.rows[].stars`
changed:

| Stars | `initialContentBytes` | boot sectors |
| ---: | ---: | ---: |
| 31 (mockup A) | 13,717 | 108 |
| 20 | 13,692 | 108 |
| 17 | 13,685 | 108 |
| **16** | **13,681** | **107** |

The ceiling for 107 sectors is 13,684 content bytes. **16 stars is the largest
sky that fits the existing ceiling**, with 3 bytes to spare — and it is still
**one new boot sector**.

Marginal cost is 2.4 B per star over that range (MEASURED, three points).
Extrapolated to zero stars the fixed part is **≈ 87 B** — the display-list
change, the tick, the one-shot draw and the glyph build. ESTIMATE, from the
measured slope. Against a 0-byte budget at 106 sectors, that is the finding
that matters: **no version of this feature fits 106 boot sectors, not even one
with no stars in it.** The display-list change alone overruns the block.

## 5. The blocker, exactly

```
BLOCKED_BOOT_SECTORS
  budget at 106 boot sectors ............ 0 bytes
  alternative A as designed ............ +161 bytes  -> 108 sectors
  smallest sky that fits the 107 ceiling  +125 bytes -> 107 sectors (16 stars)
  fixed cost with no stars at all ....... ~87 bytes  -> 107 sectors
  smallest recovery to ship anything .... +1 boot sector (106 -> 107)
```

## 6. Compliant alternatives

| # | What the owner gets | Cost | Risk |
| --- | --- | --- | --- |
| **A′** | Mockup A cut to **16 stars** — the full seven-row layout, both tones, the twinkle, the side stars; a thinner sky than the mockup | boot 106 → **107**, inside the ceiling the tree already enforces; no chunk-loader change; `MAIN` byte-identical, no pinned address moves | Low for the code. The open question is boot smoke: one extra initial-block sector is the change the frame-300 checkpoint is most sensitive to, and the ATR menu deadline was last measured with 0 frames of slack. Must be proven before commit, not after |
| **B′** | Mockup A in full, 31 stars, as the parked branch built it | boot 106 → **108**, and the `validateInitialBlockCapacity` ceiling 107 → 108 | Higher than A′ for the same reason, twice over. This is what `feat/menu-stars-a` already does |
| **C′** | Defer. Bank the finding and take the sky when something else frees initial-block bytes | 0 bytes, 0 sectors, no feature | None, but no stars — and see §6.1: there is no cheap 161 B anywhere in the block, so "something else" is a real task and not a tidy-up |

### 6.1 There is nothing cheap left in the initial block

The two candidates worth measuring, because both travel **unpacked** today:

| Item | Now | If packed / trimmed | Recovered |
| --- | ---: | ---: | ---: |
| Splash blob (`bootSplashRuntime`) | 512 B raw | 473 B packed | **39 B** |
| `A2_KERNEL` (237 B used in a 256 B `fill = yes` region) | 256 B raw | 218 B packed | **38 B** |
| | | | **77 B** |

MEASURED with the tree's own `LZ-10/5` packer. Both would need a decoder at a
point in boot that has none today, so both are their own task — and even if
both were free, 77 B does not reach the **87 B** the display-list change costs
with no stars in it at all, let alone alternative A's 161 B. **Nothing keeps
this feature inside 106 boot sectors.** The sector is the price.

The honest recommendation is **A′**, gated on boot smoke, if the owner will
spend the sector the hull merge freed — it is the only option that puts a sky
on the menu at all. If the sector is not for spending, the answer is **C′**.
Either way, `menu-stars-resident-space.md` §4's "0 new boot sectors" for
alternative A should be read as withdrawn.

## 7. Recovering the implementation

Nothing is lost and nothing needs re-deriving. The complete, reviewed
implementation — generator, asset block, runtime, display list and a 454-line
executed test file — is on `feat/menu-stars-a` and applies to `73108dc`:

```sh
git diff cc7b8d6 feat/menu-stars-a -- src/main.s scripts/build.mjs \
    scripts/frontend-h31-assets.mjs assets/graphics/frontend-h31.json \
  | git apply --3way
git checkout feat/menu-stars-a -- tests/menu-stars.test.mjs
```

MEASURED this session: that applies cleanly, assembles and links; only
`scripts/chunk-loader.mjs`'s sector ceiling stands between it and a built
artifact. Its own `chunk-loader.mjs` change (107 → 108) is the B′ decision and
was deliberately **not** taken here.


---

## 8. Owner decision and delivered result (2026-09-23)

**OWNER DECISION — alternative `A′`.** Mockup A cut to **16 stars**, exactly as
§6 describes it: the full layout, both tones, the twinkle and the side stars, a
thinner sky. The "no new boot sectors" constraint was lifted **by exactly one
sector**: boot may go 106 → 107, it may not go to 108, and
`validateInitialBlockCapacity`'s ceiling of 107 stays as it is. `B′` (31 stars,
ceiling 108) and `C′` (defer) were rejected.

The owner's rationale, recorded because it is the reason the sector was
available at all: the tree shipped at **107 sectors** from before the hull merge
until 2026-09-22, with the ATR menu deadline and the boot-smoke checkpoints
green. The hull v2 art freed that sector by accident. Spending it restores a
previously proven transport size rather than entering new territory.

### 8.1 What shipped

The implementation is §7's, recovered from `feat/menu-stars-a` and applied to
this branch unchanged apart from the star counts; `scripts/chunk-loader.mjs` is
**not** touched, so the ceiling stays 107. Sixteen stars, distributed by
halving each row of the mockup, so all twelve rows and both side groups still
carry a star:

| | `main` `73108dc` | delivered `A′` |
| --- | ---: | ---: |
| `initialBootContentBytes` | 13,556 | **13,681** (ceiling 13,684) |
| initial-block envelope | 12 | **15** |
| boot sectors | 106 | **107** |
| extension sectors | 101 | **102** |
| total transport sectors | 207 | **209** |
| `STARFIELD` raw / packed | 1,990 / 1,701 | **2,039 / 1,749** |
| `ENTITY_CODE` → BROADSIDE staging margin | 84 B | **7 B** |
| `PICKUP_CODE` stream fill | 89 B | **5 B** |

Two rows deserve reading twice. The **extension** sector is a cost §3 did not
measure, because §3 costed the initial block only: the per-frame tick, its
twelve-byte cycle table and its frame counter take 84 of `PICKUP_CODE`'s 89 free
bytes, and `PICKUP_CODE` rides an extension chunk (§1). That is +1 extension
sector, 84 B of fixed code that does **not** move with the star count. And the
**7-byte** `ENTITY_CODE`→BROADSIDE staging margin is now the scarcest number in
the transport: the next thing added to `STARFIELD` hits that wall, and the
16-byte `$4801` pickup-staging margin, long before it reaches the 1,825-byte
packed gate.

### 8.2 Boot is the gate — MEASURED before the commit

Boot smoke **8/8** at 106 and again at 107, both on the in-repo Atari800
(`--atari800-source=build/atari800-trace`).

| milestone | baseline JSON | at 106 (`73108dc`) | at 107 (`A′`) | delta vs baseline |
| --- | ---: | ---: | ---: | --- |
| `xex_loader_frames` | 135 | 135 | **135** | +0 |
| `xex_menu_frames` | 392 | 392 | **392** | +0 |
| `atr_loader_frames` | 339 | 344 | **346** | **+7**, inside the +10 warn band |
| `atr_menu_frames` | 596 | 601 | **603** | **+7**, inside the +10 warn band |

XEX does not move at all — it is one load, not a sector-by-sector one. The ATR
milestones pay ~1 frame per transport sector, and the feature adds two (one boot,
one extension), which is the +2 above. Against the 3,000-frame absolute ceiling
the ATR menu uses **603 of 3,000**. Against the delta gate the remaining warn
margin is **3 frames** and the remaining fail margin **43**.

The old hard-coded frame-300 loader checkpoint no longer exists: it was re-based
on 2026-09-20 so that the loader observation point follows the measured
milestone (`BOOT_LOADER_OBSERVE_OFFSET`, `scripts/runtime-wall-trace.mjs`), and
the loader now has its own baseline row in the table above. Every session
asserts the emulator captured exactly the expected frames, and all eight did.

**`docs/boot-deadline-baseline.json` is NOT re-recorded.** Its rule says to
re-record deliberately in the same commit as a change that grows the transport
on purpose — and this repo has consistently applied that rule as *re-record when
the band is the thing being moved, not while the measurement is still inside
it*: the ADR-003 splash grew the initial block 103 → 107 at +4/+4 and did not
re-record, and the hull v2 shrink 107 → 106 at 344/601 did not re-record either.
Re-recording here would also silently absorb the +5 of drift those commits left
standing, which is exactly the drift the delta gate exists to keep visible. The
band still holds with 3 frames to spare, so the baseline stands and the drift
stays on the record.

### 8.3 Gameplay did not move

The full PAL audit, 67 replays, regenerated on the delivered artifact:

| | baseline `73108dc` | delivered `A′` |
| --- | ---: | ---: |
| worst fence margin (GO ≥ 500) | 979 | **991** |
| DMA-on maximum | 31,351 | **31,349** |
| physical headroom | 4,217 | **4,219** |
| distinct miss events | 0 | **0** |
| rows over the 31,200 target | 4 | **4** |
| rows over the 32,568 hard gate | 0 | **0** |
| deadline overruns / missed frames | 0 / 0 | **0 / 0** |
| behavioural clause failures | 40 | **40**, the same names, 0 new |

All three cycle figures move in the *favourable* direction by 2-12 cycles, and
none of them is a gameplay change: the sky's 49 bytes sit at the head of
`STARFIELD`, so the gameplay code after them shifts by 49 bytes and a handful of
indexed accesses land on the cheap side of a page boundary that used to cost the
extra cycle. The worst frame is still `director-complete-2-natural-sweep-fire0`.

### 8.4 The durable lesson

Recorded in `docs/reguly-projektu.txt` §11 (rules v3.3), because it is a rule
about how to cost work and not a fact about this feature:

> A free window measured in **address space is not a transport budget.** Boot
> sectors are paid in **packed** bytes; a reserved tail is free only while it
> holds zeros, and incompressible data fills it at ~1:1. A `fill = yes` region's
> slack is worth ~0 transport bytes. Cost every "how many sectors" question on a
> built artifact (`transportCapacity.initialBootContentBytes`), never on the
> memory map.

`menu-stars-resident-space.md` §4 now carries the correction inline.
