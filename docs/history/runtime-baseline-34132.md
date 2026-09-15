# Historical record — not a current source of truth.

## Shield pre-implementation baseline

Recorded before runtime optimization on branch `feature/weapon-pickup-shield`
at HEAD `2d9c372fca629dc6a96b0f4d24f3ebf2eca6fc5c`.

| Measure | Baseline |
| --- | ---: |
| Worst measured PAL wall | 34,132 cycles |
| Physical PAL headroom | 1,436 cycles |
| Boot payload | 16,384 bytes / 128 sectors |
| Source-owned payload reserve | 116 bytes |
| Runtime/code/data | 15,355 bytes |

Baseline artifact hashes:

- boot BIN: `efb87208c47fd68b29a9c3c254af5127f5fceff0395308503bd3bfc10fa727bf`;
- XEX: `f1cf179645c953c493d63c2c0c378d6caf4aac93ab78647798f1ca1fbef9fc09`;
- ATR: `4ca5d1d82b077fe682e9c1db1937209775ffd8184660bc0593565df82f2579a6`;
- stale schema-v2 trace: `e9e78f24ff9de83da7f5870a8ba78a4316b03d2cfb4a166e92cd8f988723d247`.

The stale trace names XEX SHA-256
`5d44145ee7d0502b3ec622fe5a3b8a6a90155b5761c664ad4f2cc4f12c42ba9e`
and therefore is not evidence for this baseline artifact. A fresh full replay
reproduced 34,132 cycles for both XEX and ATR, then stopped before final binding
because the Difficulty 2 coverage aggregate did not contain one complete debris
flight.

## Confirmed cause and profile

The 34,132-cycle frame was legal, deterministic, and repeatable in the pickup
hunt replay and in both XEX and ATR memory-integrity hunts at frame 1,087. It
was not a host boundary or instrumentation error. The state combined nine Player Fighter
and seven Interceptor projectiles, a live Interceptor, one debris entity, active Spread
Shot, world/far/hull work, broadside update, music, sound, and both production
DLIs. Missed synchronization, deadline overruns, and extra VBI boundaries were
all zero.

The pre-optimization host-only profile summed exactly to the measured wall:

| Sequential work | Cycles |
| --- | ---: |
| Entity/effect erase | 130 |
| Projectile erase/backing | 1,474 |
| Capsule resident pass | 29 |
| Frame visual ticks | 477 |
| Player/input | 958 |
| Enemy update | 1,163 |
| Fighter projectile update/collision | 2,203 |
| Player/enemy collision | 72 |
| Broadside update | 214 |
| Damage resolution | 949 |
| Collision return | 12 |
| Player Fighter weapon control | 1,036 |
| Interceptor weapon control | 70 |
| World/ring/hull/starfield, including 236 DLI cycles | 13,775 |
| Hull contact | 586 |
| Entity/effect update | 549 |
| Effect visuals | 1,358 |
| Broadside render | 115 |
| Projectile render/backing, including 98 DLI cycles | 8,496 |
| Entity/effect render | 210 |
| Sector completion | 27 |
| Music and sound | 182 |
| Loop tail | 47 |
| **Wall** | **34,132** |

The dominant cause was therefore a real overlap of world/ring work and the
per-slot projectile erase/update/render path. It was heavier than the older
report because that report was bound to a different XEX.

## Resolution

The release-equivalent optimizations removed redundant inactive/rendered tests,
deferred projectile screen-pointer calculation until actual render, specialized
that pointer calculation to the existing row table, changed the atomic Spread
allocator from repeated scans to one bounded scan, and replaced repeated
composite-glyph high-byte calculation with its fixed page. Counts, cadence,
collision order, backing, RNG, damage, score, and every physical pool remained
unchanged.

The current bound runtime measures 33,020 cycles with 2,548 cycles of physical
headroom: 1,112 cycles recovered. Its source-owned reserve is 101 bytes. The
current source of truth is [runtime-headroom-layout-d2.md](runtime-headroom-layout-d2.md), not
this historical record.
